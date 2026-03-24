/**
 * 修正物理科常見 Plotly 3D 錯誤：例如「四球平衡」被畫成座標平面片 + 幾乎看不見的點。
 */

type Vec3 = [number, number, number];

function collectContext(traces: any[], title?: string, caption?: string, explanation?: string): string {
  const fromTraces = traces.map((t) => [t?.name, t?.text].filter(Boolean).join(' ')).join(' ');
  return [title, caption, explanation, fromTraces].filter(Boolean).join(' ');
}

/** 題意／標題暗示「四球（三底一頂）平衡」類情境（避免泛稱「球」的其它題型誤判） */
export function fourSphereEquilibriumHint(ctx: string): boolean {
  const t = ctx.toLowerCase();
  const fourish =
    /四球|四個球體|四顆球|四個球/i.test(ctx) ||
    /four[-\s]?sphere|four spheres|\bfour\b.*\bsphere\b/i.test(t);
  const threeBottom =
    /三.*支撐|底部.*三.*球|三球.*支撐|三底一頂|三個支撐球/i.test(ctx) ||
    /three.*supporting.*sphere|bottom.*three.*sphere/i.test(t);
  const titled =
    /equilibrium.*geometry/i.test(t) && /sphere/i.test(t) && (/four|4/.test(t) || /四/.test(ctx));
  return fourish || threeBottom || titled;
}

function spread(arr: number[]): number {
  return Math.max(...arr) - Math.min(...arr);
}

/** mesh3d 四頂點且落在單一平面（常誤當「座標面」背景） */
export function isAxisAlignedPlaneMesh4(t: any): boolean {
  if (t?.type !== 'mesh3d' || !Array.isArray(t.x) || t.x.length !== 4) return false;
  const xs = t.x.map(Number);
  const ys = t.y.map(Number);
  const zs = t.z.map(Number);
  if ([...xs, ...ys, ...zs].some((n) => Number.isNaN(n))) return false;
  const sx = spread(xs);
  const sy = spread(ys);
  const sz = spread(zs);
  const eps = 1e-5;
  return (
    (sz < eps && sx > eps && sy > eps) ||
    (sy < eps && sx > eps && sz > eps) ||
    (sx < eps && sy > eps && sz > eps)
  );
}

/** 明顯可見的「球心」標記數量（過小則視為未畫出球體） */
function countLargeSphereMarkers(traces: any[]): number {
  let n = 0;
  for (const t of traces) {
    if (t?.type !== 'scatter3d') continue;
    const mode = String(t.mode || '');
    if (!mode.includes('markers')) continue;
    const xs = t.x;
    if (!Array.isArray(xs)) continue;
    const len = xs.filter((v: any) => v != null && !Number.isNaN(Number(v))).length;
    if (len === 0) continue;
    const sz = t.marker?.size;
    const minSz =
      typeof sz === 'number'
        ? sz
        : Array.isArray(sz)
          ? Math.min(...sz.map((v: any) => Number(v)).filter((v: number) => !Number.isNaN(v)))
          : 6;
    if (minSz >= 11) n += len;
  }
  return n;
}

export function needsFourSphereEquilibriumRepair(traces: any[], ctx: string): boolean {
  if (!fourSphereEquilibriumHint(ctx)) return false;
  const planes = traces.filter(isAxisAlignedPlaneMesh4).length;
  const markers = countLargeSphereMarkers(traces);
  return planes >= 2 || markers < 4;
}

function seg(a: Vec3, b: Vec3, frac: number): { x: number[]; y: number[]; z: number[] } {
  return {
    x: [a[0], a[0] + frac * (b[0] - a[0])],
    y: [a[1], a[1] + frac * (b[1] - a[1])],
    z: [a[2], a[2] + frac * (b[2] - a[2])],
  };
}

/**
 * 相等半徑 r 三球放於水平面、第四球置於正上方互相外切的典型幾何（尺度適合 scene cube）。
 */
export function buildFourSphereEquilibriumTraces(): any[] {
  const r = 0.28;
  const side = 2 * r;
  const Rtri = side / Math.sqrt(3);
  const z0 = r;
  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  const bottoms: Vec3[] = angles.map((th) => [Rtri * Math.cos(th), Rtri * Math.sin(th), z0]);
  const dz = Math.sqrt(side * side - Rtri * Rtri);
  const top: Vec3 = [0, 0, z0 + dz];

  const pad = 0.55;
  const ground = {
    type: 'mesh3d',
    x: [-pad, pad, pad, -pad],
    y: [-pad, -pad, pad, pad],
    z: [0, 0, 0, 0],
    color: '#64748b',
    opacity: 0.18,
    name: '水平面 (z=0)',
    lighting: { ambient: 0.9, diffuse: 0.35 },
    showscale: false,
  };

  const bottomSpheres = {
    type: 'scatter3d',
    mode: 'markers',
    x: bottoms.map((p) => p[0]),
    y: bottoms.map((p) => p[1]),
    z: bottoms.map((p) => p[2]),
    marker: {
      size: 22,
      color: '#2563eb',
      symbol: 'circle',
      line: { width: 2, color: '#1e3a8a' },
    },
    name: '底部支撐球 (×3)',
  };

  const topSphere = {
    type: 'scatter3d',
    mode: 'markers',
    x: [top[0]],
    y: [top[1]],
    z: [top[2]],
    marker: {
      size: 24,
      color: '#dc2626',
      symbol: 'circle',
      line: { width: 2, color: '#7f1d1d' },
    },
    name: '頂部球',
  };

  const g0 = seg(top, [top[0], top[1], top[2] - 0.55], 1);
  const gravity = {
    type: 'scatter3d',
    mode: 'lines',
    x: g0.x,
    y: g0.y,
    z: g0.z,
    line: { color: '#ea580c', width: 7 },
    name: '重力 (↓)',
  };

  const contactTraces = bottoms.map((b, i) => {
    const s = seg(top, b, 0.82);
    return {
      type: 'scatter3d',
      mode: 'lines',
      x: s.x,
      y: s.y,
      z: s.z,
      line: { color: '#fbbf24', width: 5, dash: 'dash' },
      name: i === 0 ? '接觸力／支撐方向' : `接觸力 ${i + 1}`,
      showlegend: i === 0,
    };
  });

  return [ground, gravity, ...contactTraces, bottomSpheres, topSphere];
}

/**
 * 若偵測為「四球平衡」但圖形明顯錯誤，改以標準模型取代；否則回傳原 traces。
 */
export function patchPhysics3dTraces(
  traces: any[],
  opts?: { title?: string; caption?: string; explanation?: string },
): any[] {
  if (!Array.isArray(traces) || traces.length === 0) return traces;
  const ctx = collectContext(traces, opts?.title, opts?.caption, opts?.explanation);
  if (!needsFourSphereEquilibriumRepair(traces, ctx)) return traces;
  return buildFourSphereEquilibriumTraces();
}
