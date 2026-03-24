// src/utils/geometryMath.ts
// 純數學計算，不依賴任何 AI，確定性結果
// 此檔案純粹新增

export interface Point {
  x: number;
  y: number;
}

/**
 * 計算兩線段的交點
 * 使用參數式線段求交公式，數值穩定
 */
export function computeLineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null; // 平行或共線

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  return {
    x: p1.x + t * d1x,
    y: p1.y + t * d1y,
  };
}

/**
 * 計算多邊形面積（Shoelace 公式）
 */
export function computePolygonArea(points: Point[]): number {
  const n = points.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * 將幾何 JSON 中的頂點和交點合併成統一的點查找表
 * 交點會用數學公式重新計算（覆蓋 AI 估算的座標）
 */
export function buildPointMap(geometry: {
  vertices: Array<{ id: string; x: number; y: number }>;
  intersections?: Array<{
    id: string;
    x: number;
    y: number;
    line1: [string, string];
    line2: [string, string];
  }>;
}): Map<string, Point> {
  const map = new Map<string, Point>();

  // 先放入所有頂點
  for (const v of geometry.vertices) {
    map.set(v.id, { x: v.x, y: v.y });
  }

  // 交點：用數學公式重算，不信任 AI 的估算值
  if (geometry.intersections) {
    for (const inter of geometry.intersections) {
      const p1 = map.get(inter.line1[0]);
      const p2 = map.get(inter.line1[1]);
      const p3 = map.get(inter.line2[0]);
      const p4 = map.get(inter.line2[1]);

      if (p1 && p2 && p3 && p4) {
        const computed = computeLineIntersection(p1, p2, p3, p4);
        if (computed) {
          map.set(inter.id, computed);
        } else {
          // 數學計算失敗時退而使用 AI 估算值
          map.set(inter.id, { x: inter.x, y: inter.y });
        }
      } else {
        map.set(inter.id, { x: inter.x, y: inter.y });
      }
    }
  }

  return map;
}

/**
 * 將 SVG 座標系中的點轉換為數學座標系（用於面積計算說明）
 * SVG: y 軸向下；數學: y 軸向上
 */
export function svgToMathCoords(
  point: Point,
  canvasHeight: number,
  scale: number = 1
): Point {
  return {
    x: point.x / scale,
    y: (canvasHeight - point.y) / scale,
  };
}
