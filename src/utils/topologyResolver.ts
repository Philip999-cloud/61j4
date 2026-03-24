// src/utils/topologyResolver.ts
// Bridge: vision topology JSON -> geometrySolver inputs -> SolvedGeometry

import type { GeometryJSON } from '../types/geometry';
import {
  solveRegularHexagon,
  solveRegularPolygon,
  type DiagonalMode,
  type ShadedAreaConstraint,
  type ShadedRegionTopology,
  type SolvedGeometry,
} from './geometrySolver';
import { solvedToGeometryJson } from './solvedToGeometryJson';

export interface TopologyJSON {
  shape_semantics: {
    primary_shape: string;
    polygon_sides: number | null;
    is_regular: boolean;
    question_type: string;
  };
  edge_topology: {
    diagonal_topology: DiagonalMode;
    specific_diagonals: [string, string][] | null;
  };
  shaded_topology: {
    exists: boolean;
    method: 'bounded_by_lines' | 'positional' | 'vertex_sequence' | 'none';
    bounded_by_lines: [string, string][] | null;
    positional: string | null;
    vertex_sequence: string[] | null;
    fill_color: string;
  };
  ocr: {
    vertex_labels: string[];
    has_coordinate_axes: boolean;
  };
  figure_context: {
    figure_in_coordinate_system: boolean;
  };
  /** From problem text (not pixel vision): prefer over boundary_lines when set. */
  numeric_constraints?: {
    shaded_to_total_ratio?: number | null;
    shaded_to_total_tolerance?: number | null;
    shaded_area_math?: number | null;
    figure_area_math?: number | null;
  } | null;
}

/**
 * Merge vision vs client numeric hints. **Client finite numbers override** vision; otherwise keep vision.
 */
export function mergeTopologyNumericConstraints(
  vision: TopologyJSON['numeric_constraints'] | null | undefined,
  client: TopologyJSON['numeric_constraints'] | null | undefined
): TopologyJSON['numeric_constraints'] | null {
  const keys = [
    'shaded_to_total_ratio',
    'shaded_to_total_tolerance',
    'shaded_area_math',
    'figure_area_math',
  ] as const;

  const out: TopologyJSON['numeric_constraints'] = {
    shaded_to_total_ratio: null,
    shaded_to_total_tolerance: null,
    shaded_area_math: null,
    figure_area_math: null,
  };

  let any = false;
  for (const k of keys) {
    const cv = client?.[k];
    const vv = vision?.[k];
    const val =
      typeof cv === 'number' && Number.isFinite(cv)
        ? cv
        : typeof vv === 'number' && Number.isFinite(vv)
          ? vv
          : null;
    out[k] = val;
    if (val != null) any = true;
  }

  return any ? out : null;
}

function parseTopologyNumericConstraint(t: TopologyJSON): ShadedAreaConstraint | undefined {
  const nc = t.numeric_constraints;
  if (!nc) return undefined;
  const tol =
    typeof nc.shaded_to_total_tolerance === 'number' && Number.isFinite(nc.shaded_to_total_tolerance)
      ? nc.shaded_to_total_tolerance
      : 0.05;
  if (
    typeof nc.shaded_to_total_ratio === 'number' &&
    Number.isFinite(nc.shaded_to_total_ratio)
  ) {
    return { mode: 'ratio', target: nc.shaded_to_total_ratio, tolerance: tol };
  }
  if (
    typeof nc.shaded_area_math === 'number' &&
    typeof nc.figure_area_math === 'number' &&
    nc.figure_area_math > 0
  ) {
    return {
      mode: 'absolute',
      shadedArea: nc.shaded_area_math,
      figureArea: nc.figure_area_math,
      tolerance: tol,
    };
  }
  return undefined;
}

function extractNumericConstraintsFromRaw(raw: Record<string, unknown>): TopologyJSON['numeric_constraints'] {
  const sr = raw.shaded_region as Record<string, unknown> | undefined;
  const ncTop = raw.numeric_constraints as Record<string, unknown> | undefined;

  const ratio =
    typeof sr?.shaded_to_total_ratio === 'number'
      ? sr.shaded_to_total_ratio
      : typeof ncTop?.shaded_to_total_ratio === 'number'
        ? ncTop.shaded_to_total_ratio
        : null;
  const tol =
    typeof sr?.shaded_to_total_tolerance === 'number'
      ? sr.shaded_to_total_tolerance
      : typeof ncTop?.shaded_to_total_tolerance === 'number'
        ? ncTop.shaded_to_total_tolerance
        : null;
  const shaded_area_math =
    typeof sr?.shaded_area_math === 'number'
      ? sr.shaded_area_math
      : typeof ncTop?.shaded_area_math === 'number'
        ? ncTop.shaded_area_math
        : null;
  const figure_area_math =
    typeof sr?.figure_area_math === 'number'
      ? sr.figure_area_math
      : typeof ncTop?.figure_area_math === 'number'
        ? ncTop.figure_area_math
        : null;

  if (
    ratio == null &&
    tol == null &&
    shaded_area_math == null &&
    figure_area_math == null
  ) {
    return null;
  }
  return {
    shaded_to_total_ratio: ratio,
    shaded_to_total_tolerance: tol,
    shaded_area_math,
    figure_area_math,
  };
}

function hasNumericShadeIntent(raw: Record<string, unknown>): boolean {
  const sr = raw.shaded_region as Record<string, unknown> | undefined;
  const ncTop = raw.numeric_constraints as Record<string, unknown> | undefined;
  if (typeof sr?.shaded_to_total_ratio === 'number') return true;
  if (
    typeof sr?.shaded_area_math === 'number' &&
    typeof sr?.figure_area_math === 'number' &&
    sr.figure_area_math > 0
  ) {
    return true;
  }
  if (typeof ncTop?.shaded_to_total_ratio === 'number') return true;
  if (
    typeof ncTop?.shaded_area_math === 'number' &&
    typeof ncTop?.figure_area_math === 'number' &&
    ncTop.figure_area_math > 0
  ) {
    return true;
  }
  return false;
}

const POSITIONAL_ALIASES: Record<string, ShadedRegionTopology> = {
  'top-right': { type: 'positional', position: 'top-right' },
  'top-left': { type: 'positional', position: 'top-left' },
  right: { type: 'positional', position: 'right' },
  left: { type: 'positional', position: 'left' },
  'bottom-right': { type: 'positional', position: 'bottom-right' },
  'bottom-left': { type: 'positional', position: 'bottom-left' },
  bottom: { type: 'positional', position: 'bottom' },
  top: { type: 'positional', position: 'top' },
  center: { type: 'positional', position: 'center' },
  'upper-center': { type: 'positional', position: 'upper-center' },
  'lower-center': { type: 'positional', position: 'lower-center' },
};

function shadedToTopology(st: TopologyJSON['shaded_topology']): ShadedRegionTopology | undefined {
  if (!st.exists || st.method === 'none') return undefined;

  if (st.method === 'bounded_by_lines' && st.bounded_by_lines && st.bounded_by_lines.length >= 2) {
    const pairs = st.bounded_by_lines.map(
      ([a, b]) => [a, b].sort() as [string, string]
    );
    return { type: 'topological', bounded_by_lines: pairs };
  }

  if (st.method === 'positional' && st.positional) {
    const key = st.positional.trim();
    return POSITIONAL_ALIASES[key] ?? { type: 'positional', position: 'top' };
  }

  if (st.method === 'vertex_sequence' && st.vertex_sequence && st.vertex_sequence.length >= 3) {
    return { type: 'explicit', vertex_ids: [...st.vertex_sequence] };
  }

  return undefined;
}

/** visualization_code.geometry_json with solver_mode (from model). */
export function isRegularPolygonSolverPayload(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return o.solver_mode === 'regular_polygon' && typeof o.polygon_sides === 'number' && o.polygon_sides >= 3;
}

export function solverModePayloadToGeometryJSON(raw: Record<string, unknown>): GeometryJSON {
  const w = typeof raw.canvas_width === 'number' ? raw.canvas_width : 480;
  const h = typeof raw.canvas_height === 'number' ? raw.canvas_height : 480;
  const diag = (raw.diagonal_topology as DiagonalMode) ?? 'all';
  const spec = (raw.specific_diagonals as [string, string][] | null | undefined) ?? null;
  const sr = raw.shaded_region as Record<string, unknown> | undefined;
  const boundaryLines = sr?.boundary_lines as [string, string][] | undefined;
  const positional =
    typeof sr?.positional === 'string' ? (sr.positional as string) : null;
  const vertexSeq = Array.isArray(sr?.vertex_sequence)
    ? (sr.vertex_sequence as string[])
    : null;
  const numeric_constraints = extractNumericConstraintsFromRaw(raw);
  const numericShade = hasNumericShadeIntent(raw);
  const visualShade =
    !!sr?.exists &&
    !!(
      (boundaryLines && boundaryLines.length >= 2) ||
      positional ||
      (vertexSeq && vertexSeq.length >= 3)
    );
  const hasShaded = numericShade || visualShade;
  const shadedMethod =
    boundaryLines && boundaryLines.length >= 2
      ? ('bounded_by_lines' as const)
      : positional
        ? ('positional' as const)
        : vertexSeq && vertexSeq.length >= 3
          ? ('vertex_sequence' as const)
          : ('none' as const);

  const topology: TopologyJSON = {
    shape_semantics: {
      primary_shape: `regular_${raw.polygon_sides}gon`,
      polygon_sides: raw.polygon_sides as number,
      is_regular: true,
      question_type: 'area_geometry',
    },
    edge_topology: {
      diagonal_topology: diag,
      specific_diagonals: spec,
    },
    shaded_topology: {
      exists: hasShaded,
      method: hasShaded ? shadedMethod : 'none',
      bounded_by_lines: boundaryLines ?? null,
      positional,
      vertex_sequence: vertexSeq,
      fill_color: typeof sr?.fill_color === 'string' ? sr.fill_color : '#fef08a',
    },
    ocr: {
      vertex_labels: Array.isArray(raw.vertex_labels)
        ? (raw.vertex_labels as string[])
        : [],
      has_coordinate_axes: false,
    },
    figure_context: {
      figure_in_coordinate_system: raw.figure_in_coordinate_system === true,
    },
    numeric_constraints,
  };

  const solved = topologyToSolvedGeometry(topology, w, h);
  return solvedToGeometryJson(solved);
}

export function topologyToSolvedGeometry(
  topology: TopologyJSON,
  canvasWidth = 480,
  canvasHeight = 480
): SolvedGeometry {
  const { shape_semantics, shaded_topology, edge_topology } = topology;
  const n = shape_semantics.polygon_sides;

  const shadedTopology = shadedToTopology(shaded_topology);
  const fill = shaded_topology.fill_color || '#fef08a';
  const shadedAreaConstraint = parseTopologyNumericConstraint(topology);

  const diagonalMode: DiagonalMode = edge_topology.diagonal_topology;
  const specific = edge_topology.specific_diagonals;

  if (!shape_semantics.is_regular || n == null || n < 3) {
    throw new Error(`No solver available for shape: ${shape_semantics.primary_shape}`);
  }

  if (n === 6) {
    return solveRegularHexagon(canvasWidth, canvasHeight, {
      shadedRegionTopology: shadedTopology,
      shadedFillColor: fill,
      diagonalMode,
      specificDiagonals: specific,
      shadedAreaConstraint,
    });
  }

  if (diagonalMode === 'some' && (!specific || specific.length === 0)) {
    throw new Error('diagonal_topology "some" requires specific_diagonals for non-hex polygons');
  }

  return solveRegularPolygon(n, canvasWidth, canvasHeight, {
    diagonalMode,
    specificDiagonals: specific,
    shadedRegionTopology: shadedTopology,
    shadedFillColor: fill,
    shadedAreaConstraint,
  });
}
