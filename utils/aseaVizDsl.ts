/**
 * ASEA 視覺化 DSL：與後端 FastAPI /api/v1/render 契約對齊的窄型驗證。
 * 與既有 visualization_code（plotly、svg_diagram 等）並存。
 */

export type AseaVizEngine = 'math' | 'physics' | 'chemistry' | 'biology';

export interface AseaRenderRequest {
  engine: AseaVizEngine;
  topic: string;
  data: Record<string, unknown>;
  styling?: Record<string, unknown>;
  /** 後端是否對產出 SVG 做簡易標籤避讓 */
  apply_layout?: boolean;
}

export interface AseaRenderVizItem extends AseaRenderRequest {
  type: 'asea_render';
  title?: string;
  caption?: string;
  /** 若模型已帶入後端回傳的 SVG，前端可直接渲染 */
  svgCode?: string;
}

export function isAseaRenderVizItem(v: unknown): v is AseaRenderVizItem {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (o.type !== 'asea_render') return false;
  if (typeof o.engine !== 'string') return false;
  if (!['math', 'physics', 'chemistry', 'biology'].includes(o.engine)) return false;
  if (typeof o.topic !== 'string' || !o.topic.trim()) return false;
  if (o.data == null || typeof o.data !== 'object' || Array.isArray(o.data)) return false;
  return true;
}

/** 斜面受力：與 PhysicsStrategy 提示的 JSON 對齊 */
export interface InclinedPlaneEnvironment {
  type: 'inclined_plane';
  angle_deg: number;
  friction?: boolean;
}

export interface InclinedPlaneForceSpec {
  type: 'gravity' | 'normal' | 'friction' | string;
  label: string;
  direction?: 'up_incline' | 'down_incline';
}

export interface InclinedPlaneObjectSpec {
  id?: string;
  forces: InclinedPlaneForceSpec[];
}

export interface InclinedPlaneFbdPayload {
  environment: InclinedPlaneEnvironment;
  objects: InclinedPlaneObjectSpec[];
}

function isInclinedEnv(e: unknown): e is InclinedPlaneEnvironment {
  if (e == null || typeof e !== 'object' || Array.isArray(e)) return false;
  const o = e as Record<string, unknown>;
  return o.type === 'inclined_plane' && typeof o.angle_deg === 'number' && Number.isFinite(o.angle_deg);
}

export function isInclinedPlaneFbdViz(v: unknown): v is VisualizationItemInclinedPlane {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (o.type !== 'free_body_diagram') return false;
  if (!isInclinedEnv(o.environment)) return false;
  if (!Array.isArray(o.objects) || o.objects.length === 0) return false;
  const first = o.objects[0];
  if (first == null || typeof first !== 'object' || Array.isArray(first)) return false;
  const fo = first as Record<string, unknown>;
  if (!Array.isArray(fo.forces)) return false;
  return fo.forces.every(
    (f) =>
      f != null &&
      typeof f === 'object' &&
      typeof (f as Record<string, unknown>).type === 'string' &&
      typeof (f as Record<string, unknown>).label === 'string',
  );
}

/** 與 VisualizationRenderer 內 VisualizationItem 交集（僅供型別收窄） */
export type VisualizationItemInclinedPlane = {
  type: 'free_body_diagram';
  environment: InclinedPlaneEnvironment;
  objects: InclinedPlaneObjectSpec[];
  title?: string;
  caption?: string;
};

export function parseInclinedPlanePayload(v: VisualizationItemInclinedPlane): InclinedPlaneFbdPayload {
  return {
    environment: v.environment,
    objects: v.objects,
  };
}

/** 化學 2D：SMILES + 可選 SMARTS 高光（後端 RDKit） */
export interface Chem2dDslData {
  molecule_format?: 'SMILES';
  molecule_string: string;
  annotations?: Array<{
    target_substructure_smarts: string;
    highlight_color?: string;
    label?: string;
  }>;
}

export function isChem2dDslData(d: unknown): d is Chem2dDslData {
  if (d == null || typeof d !== 'object' || Array.isArray(d)) return false;
  const o = d as Record<string, unknown>;
  return typeof o.molecule_string === 'string' && o.molecule_string.trim().length > 0;
}

/** 生物母版 DSL */
export interface BiologyTemplateDslData {
  base_template: string;
  dynamic_states?: Record<string, unknown>;
  pathways?: unknown[];
}

export function isBiologyTemplateDslData(d: unknown): d is BiologyTemplateDslData {
  if (d == null || typeof d !== 'object' || Array.isArray(d)) return false;
  const o = d as Record<string, unknown>;
  return typeof o.base_template === 'string' && o.base_template.trim().length > 0;
}
