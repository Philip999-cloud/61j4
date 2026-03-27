import {
  parsePhase3ChemAromatic,
  parsePhase3StemXY,
  parseFreeBodyForces,
  parseCircuitSchematic,
  parseChemSmiles2D,
  parsePunnettSquare,
  parsePedigree,
  parseMermaidFlowchart,
  parseEarthCelestial,
  parseEarthContour,
  parseTitrationCurve,
  parseEnergyLevelDiagram,
  parsePeriodicTableHighlight,
} from './phase3VizPayload';
import { isAseaRenderVizItem, isInclinedPlaneFbdViz } from './aseaVizDsl';
import { isRegularPolygonSolverPayload } from '@/src/utils/topologyResolver';
import type { GeometryJSON } from '@/src/types/geometry';
import { normalizePythonPlotViz } from './normalizePythonPlotViz';
import { safeParseVisualizationItem } from './stemVisualizationZod';

const PLOTLY_TRACE_TYPES = new Set([
  'scatter',
  'bar',
  'line',
  'pie',
  'histogram',
  'box',
  'violin',
  'heatmap',
  'contour',
  'surface',
  'mesh3d',
  'scatter3d',
  'scatterpolar',
  'waterfall',
  'funnel',
  'treemap',
  'sunburst',
  'sankey',
]);

/** 單一 Plotly trace 物件（非包在陣列裡）是否像有可繪資料 */
function singlePlotlyTraceLooksRenderable(o: Record<string, unknown>): boolean {
  const t = o.type;
  if (typeof t !== 'string' || !PLOTLY_TRACE_TYPES.has(t)) return false;
  if (t === 'surface' && o.z != null) return true;
  if (t === 'mesh3d') {
    const xs = o.x;
    if (Array.isArray(xs) && xs.length > 0) return true;
    if (o.i != null && o.j != null && o.k != null) return true;
    if (o.alphahull != null) return true;
    return false;
  }
  if (t === 'scatter3d') {
    return o.x != null || o.y != null || o.z != null;
  }
  if (o.x != null && o.y != null) return true;
  return false;
}

export function plotlyDataLooksRenderable(data: unknown): boolean {
  if (data == null) return false;
  if (Array.isArray(data) && data.length > 0) return true;
  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data) && o.data.length > 0) return true;
    if (Array.isArray(o.traces) && o.traces.length > 0) return true;
    if (o.x != null && o.y != null) return true;
    if (singlePlotlyTraceLooksRenderable(o)) return true;
    // 與 VisualizationRenderer.normalizePlotlyData 一致：模型常把 traces 放在 data: { data: [...] }
    const inner = o.data;
    if (
      inner != null &&
      typeof inner === 'object' &&
      !Array.isArray(inner) &&
      Array.isArray((inner as Record<string, unknown>).data) &&
      (inner as { data: unknown[] }).data.length > 0
    ) {
      return true;
    }
  }
  return false;
}

export function geometryJsonItemRenderable(item: { type?: string; code?: unknown }): boolean {
  if (item.type !== 'geometry_json') return false;
  const c = item.code;
  if (typeof c === 'string' && c.trim().length > 0) return true;
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    if (isRegularPolygonSolverPayload(c as Record<string, unknown>)) return true;
    const g = c as GeometryJSON;
    if (typeof g.shape_type === 'string' && Array.isArray(g.vertices)) return true;
  }
  return false;
}

function mol3dLoadable(v: Record<string, unknown>): boolean {
  if (v.cid != null && String(v.cid).trim() !== '') return true;
  if (typeof v.smiles === 'string' && v.smiles.trim().length > 0) return true;
  if (typeof v.pdb === 'string' && v.pdb.trim().length > 0) return true;
  if (typeof v.mol === 'string' && v.mol.trim().length > 0) return true;
  return false;
}

export interface VizValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * 單一 visualization 物件是否值得掛載渲染；失敗時前端應降級（不畫該塊，保留文字）。
 */
export function validateVisualizationItem(item: unknown): VizValidationResult {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { valid: false, reason: 'not_object' };
  }
  const zodResult = safeParseVisualizationItem(item);
  if (!zodResult.ok) {
    return { valid: false, reason: 'zod_shape' };
  }
  const v = item as Record<string, unknown>;
  const t = v.type;
  if (typeof t !== 'string' || !t.trim()) {
    return { valid: false, reason: 'missing_type' };
  }

  switch (t) {
    case 'svg_diagram': {
      const s =
        (typeof v.svgCode === 'string' && v.svgCode.trim()) ||
        (typeof v.code === 'string' && v.code.trim());
      return s ? { valid: true } : { valid: false, reason: 'svg_empty' };
    }
    case 'plotly_chart': {
      const d = v.data;
      const ok = plotlyDataLooksRenderable(d);
      if (!ok && typeof fetch !== 'undefined') {
        // #region agent log
        fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '875c85' },
          body: JSON.stringify({
            sessionId: '875c85',
            runId: 'post-fix',
            hypothesisId: 'H3',
            location: 'validateStemVisualization.ts:plotly_chart',
            message: 'plotly_no_data shape',
            data: {
              dataIsArray: Array.isArray(d),
              arrLen: Array.isArray(d) ? d.length : null,
              nestedLen:
                d && typeof d === 'object' && !Array.isArray(d) && Array.isArray((d as Record<string, unknown>).data)
                  ? (d as { data: unknown[] }).data.length
                  : null,
              hasTraceXY:
                d && typeof d === 'object' && !Array.isArray(d)
                  ? (d as Record<string, unknown>).x != null && (d as Record<string, unknown>).y != null
                  : false,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
      return ok ? { valid: true } : { valid: false, reason: 'plotly_no_data' };
    }
    case 'recharts_plot':
      return Array.isArray(v.data) && v.data.length > 0
        ? { valid: true }
        : { valid: false, reason: 'recharts_no_data' };
    case 'geometry_json':
      return geometryJsonItemRenderable(v as { type?: string; code?: unknown })
        ? { valid: true }
        : { valid: false, reason: 'geometry_invalid' };
    case 'python_script':
      return typeof v.code === 'string' && v.code.trim().length > 0
        ? { valid: true }
        : { valid: false, reason: 'python_script_empty' };
    case 'python_plot': {
      const pp = normalizePythonPlotViz(v);
      const ok = !!(pp.svgCode?.trim() || (pp.func_str?.trim() && pp.x_range && pp.y_range));
      return ok ? { valid: true } : { valid: false, reason: 'python_plot_incomplete' };
    }
    case 'chem_aromatic_ring':
      return parsePhase3ChemAromatic(v) != null
        ? { valid: true }
        : { valid: false, reason: 'chem_aromatic_invalid' };
    case 'stem_xy_chart':
      return parsePhase3StemXY(v) != null
        ? { valid: true }
        : { valid: false, reason: 'stem_xy_invalid' };
    case 'titration_curve':
      return parseTitrationCurve(v) != null
        ? { valid: true }
        : { valid: false, reason: 'titration_invalid' };
    case 'physics_wave_interference':
    case 'physics_snell_diagram':
      return { valid: true };
    case 'mol3d':
      return mol3dLoadable(v) ? { valid: true } : { valid: false, reason: 'mol3d_no_structure' };
    case 'nanobanan_image':
      return typeof v.prompt === 'string' && v.prompt.trim().length > 0
        ? { valid: true }
        : { valid: false, reason: 'nanobanan_no_prompt' };
    case 'free_body_diagram': {
      if (isInclinedPlaneFbdViz(v)) return { valid: true };
      const fbd = parseFreeBodyForces(v);
      return fbd && fbd.forces.length > 0 ? { valid: true } : { valid: false, reason: 'fbd_no_forces' };
    }
    case 'physics_collision': {
      const p = v.parameters as Record<string, unknown> | undefined;
      const ok = !!(p && p.ball_A && p.ball_B);
      return ok ? { valid: true } : { valid: false, reason: 'collision_incomplete' };
    }
    case 'physiology_mechanism': {
      const ok =
        (typeof v.topic === 'string' && v.topic.trim().length > 0) ||
        (Array.isArray(v.layers) && v.layers.length > 0);
      return ok ? { valid: true } : { valid: false, reason: 'physiology_incomplete' };
    }
    case 'asea_render':
      return isAseaRenderVizItem(v) ? { valid: true } : { valid: false, reason: 'asea_invalid' };
    case 'chemistry_2d': {
      const d = v.data;
      if (!d || typeof d !== 'object' || Array.isArray(d)) return { valid: false, reason: 'chemistry_2d_no_data' };
      const ms = (d as Record<string, unknown>).molecule_string;
      return typeof ms === 'string' && ms.trim().length > 0
        ? { valid: true }
        : { valid: false, reason: 'chemistry_2d_no_smiles' };
    }
    case 'circuit_schematic':
      return parseCircuitSchematic(v) != null
        ? { valid: true }
        : { valid: false, reason: 'circuit_invalid' };
    case 'chem_smiles_2d_lone_pairs':
      return parseChemSmiles2D(v) != null
        ? { valid: true }
        : { valid: false, reason: 'chem_smiles_2d_invalid' };
    case 'biology_punnett_square':
      return parsePunnettSquare(v) != null
        ? { valid: true }
        : { valid: false, reason: 'punnett_invalid' };
    case 'biology_pedigree':
      return parsePedigree(v) != null ? { valid: true } : { valid: false, reason: 'pedigree_invalid' };
    case 'mermaid_flowchart':
      return parseMermaidFlowchart(v) != null
        ? { valid: true }
        : { valid: false, reason: 'mermaid_invalid' };
    case 'earth_celestial_geometry':
      return parseEarthCelestial(v) != null
        ? { valid: true }
        : { valid: false, reason: 'celestial_invalid' };
    case 'earth_contour_map':
      return parseEarthContour(v) != null
        ? { valid: true }
        : { valid: false, reason: 'contour_invalid' };
    case 'energy_level_diagram':
      return parseEnergyLevelDiagram(v) != null
        ? { valid: true }
        : { valid: false, reason: 'energy_level_invalid' };
    case 'periodic_table_highlight':
      return parsePeriodicTableHighlight(v) != null
        ? { valid: true }
        : { valid: false, reason: 'periodic_invalid' };
    case 'image_description':
    case 'matplotlib':
      return { valid: false, reason: 'non_renderable_type' };
    default:
      if (PLOTLY_TRACE_TYPES.has(t) && (v.x != null || v.y != null || v.z != null)) {
        return { valid: true };
      }
      return { valid: false, reason: 'unknown_type' };
  }
}

export function filterRenderableVisualizations<T>(items: T[] | undefined | null): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((it) => validateVisualizationItem(it).valid);
}
