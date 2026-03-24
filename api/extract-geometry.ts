// api/extract-geometry.ts
// Geometry extraction API — v4 topology-only + math solver

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { GeometryExtractionResult, GeometryJSON } from '../src/types/geometry';
import type { TopologyJSON } from '../src/utils/topologyResolver';
import {
  mergeTopologyNumericConstraints,
  topologyToSolvedGeometry,
} from '../src/utils/topologyResolver';
import { solvedToGeometryJson } from '../src/utils/solvedToGeometryJson';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || '',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:4210',
  'http://127.0.0.1:4210',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
].filter(Boolean);

function isPrivateLanOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    return /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h);
  } catch {
    return false;
  }
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.VERCEL_ENV === 'development' && isPrivateLanOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const GEOMETRY_EXTRACTION_SYSTEM_PROMPT_V4 = `
You are a TOPOLOGY extractor for mathematical geometry figures.
Your job is to identify STRUCTURE (what connects to what) and SEMANTICS (what kind of shape).
You DO NOT need to provide pixel coordinates — the math solver will compute them exactly.

OUTPUT ONLY valid JSON. Start with { and end with }. No markdown, no explanation.

=== WHAT YOU MUST IDENTIFY (no coordinates needed) ===

1. SHAPE SEMANTICS
   - primary_shape: "regular_hexagon" | "regular_pentagon" | "triangle" | "circle" | etc.
   - polygon_sides: number of sides (6 for hexagon)
   - is_regular: true if ALL sides equal AND ALL angles equal
   - question_type: "area_geometry" | "coordinate_geometry" | "function_graph" | "vector"

2. EDGE TOPOLOGY (which vertices connect — no coordinates)
   - diagonal_topology: "all" | "long_only" | "some" | "none"
     "all" = every possible diagonal is drawn
     "long_only" = only diagonals connecting opposite vertices
     "some" = some but not all diagonals
   - If "some", list which pairs: e.g. [["A","D"],["B","E"],["A","C"]]

3. SHADED REGION TOPOLOGY (describe without coordinates)
   Method A — bounded_by_lines (most accurate):
     List the line segments that form the boundary of the shaded region.
     Each line is identified by its two endpoint vertex letters.
   Method B — positional:
     "top-right" | "top-left" | "right" | "left" | "bottom-right" | "bottom-left"
     | "upper-center" | "lower-center" | "center"
   Method C — vertex_sequence: vertex letters in clockwise order (must match solver vertex ids / labels).

4. OCR
   - vertex_labels: letters visible at polygon corners (e.g., ["A","B","C","D","E","F"])
   - shaded_color: the fill color as hex (e.g., "#fef08a" for yellow)
   - has_coordinate_axes: true ONLY if X/Y axes with number labels are visible

5. FIGURE CONTEXT
   - figure_in_coordinate_system: true ONLY if the polygon is drawn ON a coordinate grid

6. NUMERIC CONSTRAINTS (optional, from any problem text visible in the image — e.g. "shaded area is 5", "hexagon area 30")
   Prefer these over guessing shaded boundary lines when the problem states areas or fractions.
   - numeric_constraints.shaded_to_total_ratio: number in (0,1), e.g. 0.1667 for 1/6 of the whole figure
   - numeric_constraints.shaded_to_total_tolerance: optional, default 0.05
   - OR numeric_constraints.shaded_area_math and figure_area_math: positive numbers in the same units (solver uses their ratio)

=== OUTPUT SCHEMA ===
{
  "shape_semantics": {
    "primary_shape": string,
    "polygon_sides": number | null,
    "is_regular": boolean,
    "question_type": string
  },
  "edge_topology": {
    "diagonal_topology": "all" | "long_only" | "some" | "none",
    "specific_diagonals": [[string, string]] | null
  },
  "shaded_topology": {
    "exists": boolean,
    "method": "bounded_by_lines" | "positional" | "vertex_sequence" | "none",
    "bounded_by_lines": [[string, string]] | null,
    "positional": string | null,
    "vertex_sequence": [string] | null,
    "fill_color": string
  },
  "ocr": {
    "vertex_labels": [string],
    "has_coordinate_axes": boolean
  },
  "figure_context": {
    "figure_in_coordinate_system": boolean
  },
  "numeric_constraints": {
    "shaded_to_total_ratio": number | null,
    "shaded_to_total_tolerance": number | null,
    "shaded_area_math": number | null,
    "figure_area_math": number | null
  } | null
}

ABSOLUTE RULES:
- Do NOT include any x,y coordinates — the solver computes them
- Do NOT suggest "python_script" or "matplotlib" — they are FORBIDDEN
- is_regular = true for any visually regular polygon (equal sides, equal angles)
- has_coordinate_axes = false for standalone polygons without labeled axes

HTTP request (optional): clients may POST numeric_constraints alongside imageBase64. Any finite number there overrides the same field from vision before solving.
`.trim();

const GEMINI_VISION_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash-preview-05-20', 'gemini-1.5-flash'] as const;

function isTopologyJSON(x: unknown): x is TopologyJSON {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  const ss = o.shape_semantics as Record<string, unknown> | undefined;
  const et = o.edge_topology as Record<string, unknown> | undefined;
  const st = o.shaded_topology as Record<string, unknown> | undefined;
  const oc = o.ocr as Record<string, unknown> | undefined;
  const fc = o.figure_context as Record<string, unknown> | undefined;
  if (!ss || !et || !st || !oc || !fc) return false;
  return (
    typeof ss.primary_shape === 'string' &&
    typeof ss.is_regular === 'boolean' &&
    typeof et.diagonal_topology === 'string' &&
    typeof st.exists === 'boolean' &&
    typeof st.method === 'string' &&
    Array.isArray(oc.vertex_labels) &&
    typeof oc.has_coordinate_axes === 'boolean' &&
    typeof fc.figure_in_coordinate_system === 'boolean'
  );
}

function coerceNumericConstraintsBody(raw: unknown): TopologyJSON['numeric_constraints'] | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const num = (x: unknown): number | null =>
    typeof x === 'number' && Number.isFinite(x) ? x : null;
  const out: NonNullable<TopologyJSON['numeric_constraints']> = {
    shaded_to_total_ratio: num(o.shaded_to_total_ratio),
    shaded_to_total_tolerance: num(o.shaded_to_total_tolerance),
    shaded_area_math: num(o.shaded_area_math),
    figure_area_math: num(o.figure_area_math),
  };
  if (
    out.shaded_to_total_ratio == null &&
    out.shaded_to_total_tolerance == null &&
    out.shaded_area_math == null &&
    out.figure_area_math == null
  ) {
    return undefined;
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType = 'image/png', numeric_constraints: bodyNumeric } = req.body as {
    imageBase64: string;
    mimeType?: string;
    numeric_constraints?: unknown;
  };
  const clientNumeric = coerceNumericConstraintsBody(bodyNumeric);

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'imageBase64 is required' });
  }

  let rawB64 = imageBase64;
  let resolvedMime = mimeType;
  const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (dataUrlMatch && dataUrlMatch[2]) {
    resolvedMime = dataUrlMatch[1] || mimeType;
    rawB64 = dataUrlMatch[2].replace(/\s/g, '');
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Gemini API key not configured' });
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: GEOMETRY_EXTRACTION_SYSTEM_PROMPT_V4 }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: resolvedMime,
              data: rawB64,
            },
          },
          {
            text: 'Extract topology only (no coordinates) from this figure as JSON. Output ONLY the JSON object, starting with {.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.05,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  try {
    let geminiRes: Response | null = null;
    let lastStatus = 0;
    for (const model of GEMINI_VISION_MODELS) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      lastStatus = geminiRes.status;
      if (geminiRes.ok) break;
      if (geminiRes.status === 404) continue;
      break;
    }

    if (!geminiRes?.ok) {
      const errorText = geminiRes ? await geminiRes.text() : 'No response';
      return res.status(500).json({
        success: false,
        error: `Gemini API error: ${lastStatus}`,
        raw_response: errorText,
      } as GeometryExtractionResult);
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({
        success: false,
        error: 'Failed to parse geometry JSON',
        raw_response: rawText,
      } as GeometryExtractionResult);
    }

    if (!isTopologyJSON(parsed)) {
      return res.status(200).json({
        success: false,
        error: 'Invalid topology JSON shape',
        raw_response: rawText,
      } as GeometryExtractionResult);
    }

    const topology = parsed as TopologyJSON;
    const mergedNumeric = mergeTopologyNumericConstraints(
      topology.numeric_constraints,
      clientNumeric
    );
    if (mergedNumeric) {
      topology.numeric_constraints = mergedNumeric;
    } else {
      delete topology.numeric_constraints;
    }

    let geometry: GeometryJSON;
    try {
      const solved = topologyToSolvedGeometry(topology, 480, 480);
      geometry = solvedToGeometryJson(solved);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Solver failed';
      return res.status(200).json({
        success: false,
        error: message,
        raw_response: rawText,
      } as GeometryExtractionResult);
    }

    return res.status(200).json({
      success: true,
      geometry,
    } as GeometryExtractionResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: message,
    } as GeometryExtractionResult);
  }
}
