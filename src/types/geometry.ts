// src/types/geometry.ts
// 幾何原語萃取的共用型別定義（v3：三層特徵 + Phase2 原語）

export type GeometryShapeType =
  | 'polygon'
  | 'regular_polygon'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'arc'
  | 'function_curve'
  | 'coordinate_plane'
  | 'composite';

// ─── v3 低層特徵（像素級） ───────────────────────────────
export interface LowLevelFeatures {
  bounding_box: { x: number; y: number; w: number; h: number };
  has_text_labels: boolean;
  estimated_line_count: number;
}

// ─── v3 中層特徵（形狀級） ───────────────────────────────
export interface MidLevelFeatures {
  primary_shape: GeometryShapeType;
  polygon_sides: number | null;
  is_regular: boolean;
  has_diagonals: boolean;
  intersection_count: number;
  has_coordinate_axes: boolean;
  has_shaded_region: boolean;
  shaded_region_shape: 'triangle' | 'quadrilateral' | 'polygon' | 'sector' | null;
}

// ─── v3 高層特徵（語義級） ───────────────────────────────
export interface HighLevelFeatures {
  question_type:
    | 'area_geometry'
    | 'coordinate_geometry'
    | 'function_graph'
    | 'vector'
    | 'trigonometry'
    | 'solid_geometry'
    | 'general';
  math_constraints: string[];
  shaded_region_description: string;
  given_conditions: string[];
  figure_in_coordinate_system: boolean;
}

// ─── v3 OCR ─────────────────────────────────────────────
export interface OCRFeatures {
  vertex_labels: Array<{ label: string; near_vertex_id: string }>;
  numeric_labels: Array<{ value: number; x: number; y: number }>;
  text_blocks: string[];
}

export interface GeometryPoint {
  id: string;
  x: number;
  y: number;
  label?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface GeometryEdge {
  from: string;
  to: string;
  style?: 'solid' | 'dashed';
  color?: string;
  edge_type?: 'boundary' | 'diagonal' | 'construction' | 'axis';
}

export interface GeometryCircle {
  id: string;
  cx: number;
  cy: number;
  r: number;
  style?: 'solid' | 'dashed';
}

/**
 * 圓弧（弧度）。0 = 指向右（+x），角度遞增 = 螢幕座標下順時針（y 向下），與常見 Canvas 方位一致。
 */
export interface GeometryArc {
  id: string;
  cx: number;
  cy: number;
  r: number;
  start_angle: number;
  end_angle: number;
  style?: 'solid' | 'dashed';
  color?: string;
}

export interface GeometryShadedRegion {
  type: 'polygon' | 'sector' | 'segment' | 'between_curves';
  vertex_ids?: string[];
  circle_id?: string;
  start_angle?: number;
  end_angle?: number;
  fill_color: string;
  opacity?: number;
}

export interface GeometryIntersection {
  id: string;
  x: number;
  y: number;
  line1: [string, string];
  line2: [string, string];
}

export interface GeometryAxis {
  show_x: boolean;
  show_y: boolean;
  x_range: [number, number];
  y_range: [number, number];
  grid?: boolean;
  x_label?: string;
  y_label?: string;
}

export interface GeometryJSON {
  /** v3：舊模型或快取可能缺漏，執行期需防護 */
  low_level?: LowLevelFeatures;
  mid_level?: MidLevelFeatures;
  high_level?: HighLevelFeatures;
  ocr?: OCRFeatures;

  shape_type: GeometryShapeType;
  canvas_width: number;
  canvas_height: number;
  vertices: GeometryPoint[];
  edges: GeometryEdge[];
  circles?: GeometryCircle[];
  arcs?: GeometryArc[];
  intersections?: GeometryIntersection[];
  shaded_regions?: GeometryShadedRegion[];
  axis?: GeometryAxis | null;
  math_constraints?: string[];
}

export interface GeometryExtractionResult {
  success: boolean;
  geometry?: GeometryJSON;
  error?: string;
  raw_response?: string;
}
