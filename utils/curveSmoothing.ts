/**
 * 為了避免破壞 Plotly 的不連續線段 (常以 null 隔開) 或類別型 X 軸 (string)，
 * 我們只針對純數值陣列進行平滑處理。
 */
export interface Point2D { x: number; y: number }

/**
 * 取得 Catmull-Rom 樣條上的插值點 (t = 0.0 ~ 1.0)
 * 需要 4 個控制點 p0, p1, p2, p3 來計算 p1 到 p2 之間的曲線
 */
function getCatmullRomPoint(t: number, p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): Point2D {
  const t2 = t * t;
  const t3 = t2 * t;

  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
  const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;

  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3
  };
}

/**
 * 估算 P1 處的夾角 (曲率)，回傳角度 (0 ~ 180)
 */
function calculateAngle(p0: Point2D, p1: Point2D, p2: Point2D): number {
  const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
  const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 180; // 直線
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * 遞迴自適應細分 (Adaptive Subdivision)
 */
function subdivide(
  p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D,
  tStart: number, tEnd: number,
  depth: number,
  maxDepth: number,
  curvatureThreshold: number,
  results: Point2D[]
) {
  if (depth >= maxDepth) return;

  const tMid = (tStart + tEnd) / 2;
  const midPoint = getCatmullRomPoint(tMid, p0, p1, p2, p3);

  // 取得頭尾的實際座標點
  const startPoint = getCatmullRomPoint(tStart, p0, p1, p2, p3);
  const endPoint = getCatmullRomPoint(tEnd, p0, p1, p2, p3);

  // 計算中點處的夾角
  const angle = calculateAngle(startPoint, midPoint, endPoint);

  // 動態 LOD 演算：隨著細分深度增加，對「彎折」的要求越嚴格，從而防止在微小曲線處爆增頂點
  // 假設初始 threshold 為 170 度，每深一層減少 5 度
  const dynamicThreshold = curvatureThreshold - (depth * 5); 

  if (angle < dynamicThreshold) {
    // 若夾角小於動態閾值，代表非常彎曲，必須繼續往兩側細分
    subdivide(p0, p1, p2, p3, tStart, tMid, depth + 1, maxDepth, curvatureThreshold, results);
    results.push(midPoint);
    subdivide(p0, p1, p2, p3, tMid, tEnd, depth + 1, maxDepth, curvatureThreshold, results);
  }
}

/**
 * 主函式：將稀疏的 Plotly trace (x, y 陣列) 平滑化
 * @param xArr 原始 X 陣列
 * @param yArr 原始 Y 陣列
 * @param maxDepth 最大細分深度（建議 3~6，防止卡頓）
 * @param curvatureThreshold 夾角閾值（通常設 170 度，低於此角度代表有明顯彎曲）
 */
export function adaptiveSmoothTrace(xArr: any[], yArr: any[], maxDepth = 5, curvatureThreshold = 175) {
  if (!xArr || !yArr || xArr.length < 3) return { x: xArr, y: yArr }; // 點太少無法形成曲線

  // 【致命 Bugs 防禦機制】
  // 1. Plotly 允許 x 值為 string (例如長條圖或類別標籤)。
  // 2. Plotly 允許資料點包含 null 以切斷線段。
  // 若我們強制對其進行 Math.hypot 計算，會產出 NaN 導致整張圖表消失（化學圖表即為此例）。
  if (xArr.some(x => typeof x === 'string') || yArr.some(y => typeof y === 'string')) {
    return { x: xArr, y: yArr }; // 退出平滑，保持原樣
  }

  // 將資料按 null/NaN 斷點切分成多個線段，分別進行平滑
  const segments: {x: number[], y: number[]}[] = [];
  let currentSegment: {x: number[], y: number[]} = {x: [], y: []};

  for (let i = 0; i < xArr.length; i++) {
    const xv = xArr[i];
    const yv = yArr[i];
    if (xv === null || xv === undefined || yv === null || yv === undefined || isNaN(Number(xv)) || isNaN(Number(yv))) {
      if (currentSegment.x.length > 0) {
        segments.push(currentSegment);
        currentSegment = {x: [], y: []};
      }
    } else {
      currentSegment.x.push(Number(xv));
      currentSegment.y.push(Number(yv));
    }
  }
  if (currentSegment.x.length > 0) segments.push(currentSegment);

  const newX: any[] = [];
  const newY: any[] = [];

  // 對每一段連續線段進行自適應平滑
  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s];
    if (seg.x.length < 3) {
      newX.push(...seg.x);
      newY.push(...seg.y);
    } else {
      const points: Point2D[] = seg.x.map((x, i) => ({ x, y: seg.y[i] }));
      const smoothPoints: Point2D[] = [];

      for (let i = 0; i < points.length - 1; i++) {
        // 構成 Catmull-Rom 需要 4 個控制點。頭尾需補點。
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];

        smoothPoints.push(p1); // 加入線段起點

        // 動態細分這一段
        const intermediatePoints: Point2D[] = [];
        subdivide(p0, p1, p2, p3, 0, 1, 0, maxDepth, curvatureThreshold, intermediatePoints);
        
        smoothPoints.push(...intermediatePoints);
      }
      
      // 加入最後一個點
      smoothPoints.push(points[points.length - 1]);

      newX.push(...smoothPoints.map(p => p.x));
      newY.push(...smoothPoints.map(p => p.y));
    }

    // 重建斷點
    if (s < segments.length - 1) {
      newX.push(null);
      newY.push(null);
    }
  }

  return { x: newX, y: newY };
}
