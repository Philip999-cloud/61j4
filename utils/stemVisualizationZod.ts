import { z } from 'zod';

/** Plotly trace `type` values accepted by validateVisualizationItem default branch. */
export const PLOTLY_TRACE_TYPE_LIST = [
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
] as const;

const ROOT_VIZ_TYPES = [
  'svg_diagram',
  'plotly_chart',
  'recharts_plot',
  'geometry_json',
  'python_script',
  'python_plot',
  'chem_aromatic_ring',
  'stem_xy_chart',
  'titration_curve',
  'physics_wave_interference',
  'physics_snell_diagram',
  'mol3d',
  'nanobanan_image',
  'free_body_diagram',
  'physics_collision',
  'physiology_mechanism',
  'asea_render',
  'chemistry_2d',
  'circuit_schematic',
  'chem_smiles_2d_lone_pairs',
  'biology_punnett_square',
  'biology_pedigree',
  'mermaid_flowchart',
  'earth_celestial_geometry',
  'earth_contour_map',
  'energy_level_diagram',
  'periodic_table_highlight',
  'image_description',
  'matplotlib',
] as const;

const ALL_ALLOWED_TYPES = new Set<string>([...ROOT_VIZ_TYPES, ...PLOTLY_TRACE_TYPE_LIST]);

/** Types that must satisfy the strict branch (not only allowed-type passthrough). */
const STRICT_SHAPE_TYPES = new Set<string>(['titration_curve']);

const finiteCoercedNumberArray = (minLen: number) =>
  z
    .array(z.coerce.number())
    .min(minLen)
    .refine((a) => a.every(Number.isFinite), { message: 'non_finite_number' });

const titrationCurveShape = z
  .object({
    type: z.literal('titration_curve'),
    x: finiteCoercedNumberArray(2),
    y: finiteCoercedNumberArray(2),
  })
  .passthrough();

const allowedTypePassthrough = z
  .object({ type: z.string().min(1) })
  .passthrough()
  .superRefine((data, ctx) => {
    if (STRICT_SHAPE_TYPES.has(data.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'strict_shape_required',
        path: ['type'],
      });
      return;
    }
    if (!ALL_ALLOWED_TYPES.has(data.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'unknown_viz_type',
        path: ['type'],
      });
    }
  });

const visualizationItemUnion = z.union([titrationCurveShape, allowedTypePassthrough]);

export type SafeParseVisualizationResult =
  | { ok: true; data: unknown }
  | { ok: false; error: z.ZodError };

/**
 * Zod shape layer for STEM visualization items (AND with validateVisualizationItem switch).
 * Call only after `item` is a non-null plain object (not array).
 */
export function safeParseVisualizationItem(item: object): SafeParseVisualizationResult {
  const r = visualizationItemUnion.safeParse(item);
  if (r.success) {
    return { ok: true as const, data: r.data };
  }
  return { ok: false as const, error: r.error };
}
