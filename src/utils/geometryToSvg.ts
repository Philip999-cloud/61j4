// src/utils/geometryToSvg.ts
// 從幾何原語 JSON 確定性地生成 SVG 字串
// 完全不呼叫任何 AI，純程式碼計算
// 此檔案純粹新增

import type { GeometryArc, GeometryJSON, GeometryPoint } from '../types/geometry';
import { buildPointMap, type Point } from './geometryMath';

const DEFAULT_STROKE = '#374151';
const DEFAULT_STROKE_WIDTH = '1.5';
const LABEL_FONT = 'font-family="system-ui, sans-serif" font-size="13" fill="#374151"';

function isPolygonVertexId(id: string): boolean {
  const lower = id.toLowerCase();
  return !lower.startsWith('intersection') && !lower.startsWith('center');
}

/**
 * Phase 2 前處理：根據三層特徵進行確定性修正（高層語義 → 中層形狀 → 低層驗證）
 */
function applyThreeLayerCorrections(geo: GeometryJSON): GeometryJSON {
  const result: GeometryJSON = {
    ...geo,
    vertices: geo.vertices.map((v) => ({ ...v })),
  };

  if (geo.high_level && !geo.high_level.figure_in_coordinate_system) {
    result.axis = null;
  }

  const mid = geo.mid_level;
  if (mid?.is_regular && mid.polygon_sides != null) {
    const n = mid.polygon_sides;
    const validVertices = result.vertices.filter((v) => isPolygonVertexId(v.id));
    if (validVertices.length === n) {
      const cx = validVertices.reduce((s, v) => s + v.x, 0) / n;
      const cy = validVertices.reduce((s, v) => s + v.y, 0) / n;
      const R =
        validVertices.reduce((s, v) => s + Math.hypot(v.x - cx, v.y - cy), 0) / n;
      const correctedVertices: GeometryPoint[] = validVertices.map((v, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        return {
          ...v,
          x: Math.round((cx + R * Math.cos(angle)) * 10) / 10,
          y: Math.round((cy + R * Math.sin(angle)) * 10) / 10,
          confidence: 'high',
        };
      });
      result.vertices = result.vertices.map((v) => {
        const corrected = correctedVertices.find((c) => c.id === v.id);
        return corrected ?? v;
      });
    }
  }

  const low = geo.low_level;
  if (low && low.estimated_line_count > geo.edges.length + 2) {
    console.warn(
      `[geometryToSvg] 警告：低層特徵估計 ${low.estimated_line_count} 條線段，` +
        `但 edges 只有 ${geo.edges.length} 條。可能有線段遺漏。`
    );
  }

  return result;
}

/**
 * 將幾何 JSON 轉換為完整的 SVG 字串
 */
export function geometryJsonToSvg(geoRaw: GeometryJSON): string {
  const geo = applyThreeLayerCorrections(geoRaw);
  const { canvas_width: W, canvas_height: H } = geo;
  const pointMap = buildPointMap(geo);

  const parts: string[] = [];

  // 1. SVG 開頭
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto">`
  );

  // 2. 座標軸（如果有）
  if (geo.axis) {
    parts.push(renderAxis(geo.axis, W, H));
  }

  // 3. 塗色區域（先畫，在邊的下面）
  if (geo.shaded_regions) {
    for (const region of geo.shaded_regions) {
      parts.push(renderShadedRegion(region, pointMap, geo));
    }
  }

  // 4. 圓形
  if (geo.circles) {
    for (const circle of geo.circles) {
      const dashArray = circle.style === 'dashed' ? 'stroke-dasharray="6 3"' : '';
      parts.push(
        `<circle cx="${fmt(circle.cx)}" cy="${fmt(circle.cy)}" r="${fmt(circle.r)}" ` +
          `fill="none" stroke="${DEFAULT_STROKE}" stroke-width="${DEFAULT_STROKE_WIDTH}" ${dashArray}/>`
      );
    }
  }

  // 4b. 圓弧（半圓端、扇形邊界等）
  if (geo.arcs) {
    for (const arc of geo.arcs) {
      parts.push(renderGeometryArc(arc));
    }
  }

  // 5. 邊/線段
  for (const edge of geo.edges) {
    const p1 = pointMap.get(edge.from);
    const p2 = pointMap.get(edge.to);
    if (!p1 || !p2) continue;

    const dashArray = edge.style === 'dashed' ? 'stroke-dasharray="6 3"' : '';
    const stroke = edge.color || DEFAULT_STROKE;
    parts.push(
      `<line x1="${fmt(p1.x)}" y1="${fmt(p1.y)}" x2="${fmt(p2.x)}" y2="${fmt(p2.y)}" ` +
        `stroke="${stroke}" stroke-width="${DEFAULT_STROKE_WIDTH}" ${dashArray}/>`
    );
  }

  // 6. 頂點標籤
  for (const vertex of geo.vertices) {
    if (!vertex.label) continue;
    const p = pointMap.get(vertex.id);
    if (!p) continue;

    // 自動計算標籤偏移：把標籤推到頂點外側
    const offset = computeLabelOffset(vertex.id, geo, pointMap);
    parts.push(
      `<text x="${fmt(p.x + offset.x)}" y="${fmt(p.y + offset.y)}" ` +
        `${LABEL_FONT} text-anchor="middle" dominant-baseline="central">` +
        `${escapeXml(vertex.label)}</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 渲染座標軸 */
function renderAxis(
  axis: NonNullable<GeometryJSON['axis']>,
  W: number,
  H: number
): string {
  const parts: string[] = [];
  const axisStyle = `stroke="${DEFAULT_STROKE}" stroke-width="1" marker-end="url(#arrowhead)"`;
  const padding = 30;

  // 定義箭頭
  parts.push(`
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="${DEFAULT_STROKE}"/>
      </marker>
    </defs>
  `);

  if (axis.show_x) {
    parts.push(
      `<line x1="${padding}" y1="${H / 2}" x2="${W - padding}" y2="${H / 2}" ${axisStyle}/>`
    );
    if (axis.x_label) {
      parts.push(
        `<text x="${W - padding - 5}" y="${H / 2 - 10}" ${LABEL_FONT}>${escapeXml(axis.x_label)}</text>`
      );
    }
  }

  if (axis.show_y) {
    parts.push(
      `<line x1="${W / 2}" y1="${H - padding}" x2="${W / 2}" y2="${padding}" ${axisStyle}/>`
    );
    if (axis.y_label) {
      parts.push(
        `<text x="${W / 2 + 10}" y="${padding + 5}" ${LABEL_FONT}>${escapeXml(axis.y_label)}</text>`
      );
    }
  }

  if (axis.grid) {
    parts.push(renderGrid(axis, W, H, padding));
  }

  return parts.join('\n');
}

/** 渲染網格線 */
function renderGrid(
  axis: NonNullable<GeometryJSON['axis']>,
  W: number,
  H: number,
  padding: number
): string {
  const parts: string[] = [];
  const gridStyle = `stroke="#e5e7eb" stroke-width="0.5"`;
  const [xMin, xMax] = axis.x_range;
  const [yMin, yMax] = axis.y_range;
  const xScale = (W - 2 * padding) / (xMax - xMin);
  const yScale = (H - 2 * padding) / (yMax - yMin);

  for (let x = Math.ceil(xMin); x <= xMax; x++) {
    const svgX = padding + (x - xMin) * xScale;
    parts.push(
      `<line x1="${fmt(svgX)}" y1="${padding}" x2="${fmt(svgX)}" y2="${H - padding}" ${gridStyle}/>`
    );
    if (x !== 0) {
      parts.push(
        `<text x="${fmt(svgX)}" y="${H / 2 + 15}" ${LABEL_FONT} text-anchor="middle" font-size="10">${x}</text>`
      );
    }
  }

  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    const svgY = H - padding - (y - yMin) * yScale;
    parts.push(
      `<line x1="${padding}" y1="${fmt(svgY)}" x2="${W - padding}" y2="${fmt(svgY)}" ${gridStyle}/>`
    );
    if (y !== 0) {
      parts.push(
        `<text x="${W / 2 - 10}" y="${fmt(svgY)}" ${LABEL_FONT} text-anchor="end" dominant-baseline="central" font-size="10">${y}</text>`
      );
    }
  }

  return parts.join('\n');
}

/** 渲染塗色區域 */
function renderShadedRegion(
  region: NonNullable<GeometryJSON['shaded_regions']>[number],
  pointMap: Map<string, Point>,
  geo: GeometryJSON
): string {
  const opacity = region.opacity ?? 0.75;

  if (region.type === 'polygon' && region.vertex_ids) {
    const points = region.vertex_ids
      .map((id) => pointMap.get(id))
      .filter((p): p is Point => !!p)
      .map((p) => `${fmt(p.x)},${fmt(p.y)}`)
      .join(' ');

    if (!points) return '';
    return `<polygon points="${points}" fill="${region.fill_color}" opacity="${opacity}" stroke="none"/>`;
  }

  if (region.type === 'sector' && region.circle_id && geo.circles) {
    const circle = geo.circles.find((c) => c.id === region.circle_id);
    if (!circle) return '';

    const startAngle = region.start_angle ?? 0;
    const endAngle = region.end_angle ?? Math.PI * 2;
    const x1 = circle.cx + circle.r * Math.cos(startAngle);
    const y1 = circle.cy + circle.r * Math.sin(startAngle);
    const x2 = circle.cx + circle.r * Math.cos(endAngle);
    const y2 = circle.cy + circle.r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return (
      `<path d="M${fmt(circle.cx)},${fmt(circle.cy)} ` +
      `L${fmt(x1)},${fmt(y1)} ` +
      `A${fmt(circle.r)},${fmt(circle.r)} 0 ${largeArc} 1 ${fmt(x2)},${fmt(y2)} Z" ` +
      `fill="${region.fill_color}" opacity="${opacity}" stroke="none"/>`
    );
  }

  return '';
}

function renderGeometryArc(arc: GeometryArc): string {
  const dashArray = arc.style === 'dashed' ? 'stroke-dasharray="6 3"' : '';
  const stroke = arc.color || DEFAULT_STROKE;
  const x1 = arc.cx + arc.r * Math.cos(arc.start_angle);
  const y1 = arc.cy + arc.r * Math.sin(arc.start_angle);
  const x2 = arc.cx + arc.r * Math.cos(arc.end_angle);
  const y2 = arc.cy + arc.r * Math.sin(arc.end_angle);
  let delta = arc.end_angle - arc.start_angle;
  while (delta <= -2 * Math.PI) delta += 2 * Math.PI;
  while (delta > 2 * Math.PI) delta -= 2 * Math.PI;
  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  const sweep = delta >= 0 ? 1 : 0;
  const d = `M ${fmt(x1)} ${fmt(y1)} A ${fmt(arc.r)} ${fmt(arc.r)} 0 ${largeArc} ${sweep} ${fmt(x2)} ${fmt(y2)}`;
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${DEFAULT_STROKE_WIDTH}" ${dashArray}/>`;
}

/** 計算頂點標籤的偏移方向（推離圖形中心） */
function computeLabelOffset(
  vertexId: string,
  geo: GeometryJSON,
  pointMap: Map<string, Point>
): Point {
  const vertex = pointMap.get(vertexId);
  if (!vertex) return { x: 0, y: -14 };

  // 計算所有頂點的重心
  const allPoints = geo.vertices.map((v) => pointMap.get(v.id)).filter((p): p is Point => !!p);
  if (allPoints.length === 0) return { x: 0, y: -14 };

  const cx = allPoints.reduce((s, p) => s + p.x, 0) / allPoints.length;
  const cy = allPoints.reduce((s, p) => s + p.y, 0) / allPoints.length;

  // 標籤推向遠離重心的方向
  const dx = vertex.x - cx;
  const dy = vertex.y - cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    x: (dx / len) * 16,
    y: (dy / len) * 16,
  };
}

/** 格式化數字，保留 2 位小數 */
function fmt(n: number): string {
  return Math.round(n * 100) / 100 + '';
}
