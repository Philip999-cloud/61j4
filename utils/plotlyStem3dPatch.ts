/**
 * 修正 AI 產生的 Plotly 3D：旋轉體僅畫母線、圓錐誤用四面體等常見錯誤。
 */

type Vec3 = [number, number, number];

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function norm(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function normalize(v: Vec3): Vec3 {
  const n = norm(v);
  if (n < 1e-12) return [0, 0, 0];
  return scale(v, 1 / n);
}

function collectContext(traces: any[], title?: string, caption?: string, explanation?: string): string {
  const fromTraces = traces.map((t) => [t?.name, t?.text].filter(Boolean).join(' ')).join(' ');
  return [title, caption, explanation, fromTraces].filter(Boolean).join(' ');
}

function circumcenter2D(p0: [number, number], p1: [number, number], p2: [number, number]): [number, number] | null {
  const [x1, y1] = p0;
  const [x2, y2] = p1;
  const [x3, y3] = p2;
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  if (Math.abs(D) < 1e-14) return null;
  const x1s = x1 * x1 + y1 * y1;
  const x2s = x2 * x2 + y2 * y2;
  const x3s = x3 * x3 + y3 * y3;
  const ux = (x1s * (y2 - y3) + x2s * (y3 - y1) + x3s * (y1 - y2)) / D;
  const uy = (x1s * (x3 - x2) + x2s * (x1 - x3) + x3s * (x2 - x1)) / D;
  return [ux, uy];
}

function apexByMaxHeight(pts: Vec3[]): number {
  let best = 0;
  let bestH = -1;
  for (let skip = 0; skip < 4; skip++) {
    const idx = [0, 1, 2, 3].filter((i) => i !== skip);
    const A = pts[idx[0]];
    const B = pts[idx[1]];
    const C = pts[idx[2]];
    const nvec = cross(sub(B, A), sub(C, A));
    const nlen = norm(nvec);
    if (nlen < 1e-12) continue;
    const n = scale(nvec, 1 / nlen);
    const h = Math.abs(dot(n, sub(pts[skip], A)));
    if (h > bestH) {
      bestH = h;
      best = skip;
    }
  }
  return best;
}

function extractLongestPolyline(x: any[], y: any[], z: any[]): { x: number[]; y: number[]; z: number[] } | null {
  let best: { x: number[]; y: number[]; z: number[] } | null = null;
  let cur = { x: [] as number[], y: [] as number[], z: [] as number[] };

  const flush = () => {
    if (cur.x.length > (best?.x.length ?? 0)) {
      best = { x: [...cur.x], y: [...cur.y], z: [...cur.z] };
    }
    cur = { x: [], y: [], z: [] };
  };

  for (let i = 0; i < x.length; i++) {
    if (x[i] == null || y[i] == null || z[i] == null) {
      flush();
      continue;
    }
    const xv = Number(x[i]);
    const yv = Number(y[i]);
    const zv = Number(z[i]);
    if (Number.isNaN(xv) || Number.isNaN(yv) || Number.isNaN(zv)) {
      flush();
      continue;
    }
    cur.x.push(xv);
    cur.y.push(yv);
    cur.z.push(zv);
  }
  flush();

  if (!best || best.x.length < 2) return null;

  const order = best.x.map((_, i) => i).sort((a, b) => best!.x[a] - best!.x[b]);
  return {
    x: order.map((i) => best!.x[i]),
    y: order.map((i) => best!.y[i]),
    z: order.map((i) => best!.z[i]),
  };
}

function isZNearlyFlatScatter3d(t: any): boolean {
  if (t?.type !== 'scatter3d') return false;
  const xs = t.x as any[];
  const ys = t.y as any[];
  const zs = t.z as any[];
  if (!Array.isArray(xs) || !Array.isArray(ys) || !Array.isArray(zs)) return false;
  const zvals: number[] = [];
  const xvals: number[] = [];
  const yvals: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] == null || ys[i] == null || zs[i] == null) continue;
    const xv = Number(xs[i]);
    const yv = Number(ys[i]);
    const zv = Number(zs[i]);
    if (Number.isNaN(xv) || Number.isNaN(yv) || Number.isNaN(zv)) continue;
    xvals.push(xv);
    yvals.push(yv);
    zvals.push(zv);
  }
  if (zvals.length < 2) return true;
  const zr = Math.max(...zvals) - Math.min(...zvals);
  const xr = Math.max(...xvals) - Math.min(...xvals);
  const yr = Math.max(...yvals) - Math.min(...yvals);
  const scale = Math.max(xr, yr, 1e-9);
  return zr / scale < 0.08;
}

function isGeneratrixScatter3d(t: any): boolean {
  if (t?.type !== 'scatter3d') return false;
  const mode = String(t.mode || 'lines');
  if (!mode.includes('lines')) return false;
  if (!Array.isArray(t.x) || t.x.length < 2) return false;
  if (!isZNearlyFlatScatter3d(t)) return false;
  const ys = (t.y as any[]).map(Number).filter((n) => !Number.isNaN(n));
  const maxR = Math.max(...ys.map((y) => Math.abs(y)), 0);
  return maxR > 1e-6;
}

function revolutionHint(ctx: string): boolean {
  return (
    /繞\s*x|繞x|繞\s*Ｘ|旋轉體|旋轉.*軸|revolution|revolv|solid\s+of\s+revolution|volume\s+of\s+solid/i.test(ctx) ||
    /母線|generatrix|旋轉母線|旋轉線/i.test(ctx)
  );
}

function coneHint(ctx: string): boolean {
  return /圓錐|直圓錐|錐體|circular\s+cone|\bcone\b/i.test(ctx);
}

function hasDenseMesh3d(traces: any[]): boolean {
  return traces.some((t) => t?.type === 'mesh3d' && Array.isArray(t.x) && t.x.length > 80);
}

function revolutionSurfaceFromGeneratrix(t: any): any | null {
  const poly = extractLongestPolyline(t.x, t.y, t.z);
  if (!poly) return null;
  const { x: xs, y: ys, z: zs } = poly;
  const nx = xs.length;
  if (nx < 2) return null;

  const nTheta = 48;
  const vx: number[] = [];
  const vy: number[] = [];
  const vz: number[] = [];

  for (let i = 0; i < nx; i++) {
    const r = Math.hypot(ys[i], zs[i]);
    for (let j = 0; j < nTheta; j++) {
      const th = (2 * Math.PI * j) / nTheta;
      vx.push(xs[i]);
      vy.push(r * Math.cos(th));
      vz.push(r * Math.sin(th));
    }
  }

  const I: number[] = [];
  const J: number[] = [];
  const K: number[] = [];
  for (let i = 0; i < nx - 1; i++) {
    for (let j = 0; j < nTheta; j++) {
      const j2 = (j + 1) % nTheta;
      const v00 = i * nTheta + j;
      const v10 = (i + 1) * nTheta + j;
      const v11 = (i + 1) * nTheta + j2;
      const v01 = i * nTheta + j2;
      I.push(v00, v00);
      J.push(v10, v11);
      K.push(v11, v01);
    }
  }

  const lineCol = typeof t.line?.color === 'string' ? t.line.color : '#38bdf8';

  return {
    type: 'mesh3d',
    x: vx,
    y: vy,
    z: vz,
    i: I,
    j: J,
    k: K,
    opacity: 0.38,
    color: lineCol,
    name: '旋轉曲面',
    lighting: { ambient: 0.82, diffuse: 0.55 },
    showscale: false,
  };
}

function buildConeFromFourVertices(xv: any[], yv: any[], zv: any[], src: any): any | null {
  const pts: Vec3[] = [
    [Number(xv[0]), Number(yv[0]), Number(zv[0])],
    [Number(xv[1]), Number(yv[1]), Number(zv[1])],
    [Number(xv[2]), Number(yv[2]), Number(zv[2])],
    [Number(xv[3]), Number(yv[3]), Number(zv[3])],
  ];
  if (pts.some((p) => p.some((n) => Number.isNaN(n)))) return null;

  const apexIdx = apexByMaxHeight(pts);
  const baseIdx = [0, 1, 2, 3].filter((i) => i !== apexIdx);
  const V = pts[apexIdx];
  const A = pts[baseIdx[0]];
  const B = pts[baseIdx[1]];
  const C = pts[baseIdx[2]];

  const ab = sub(B, A);
  const ac = sub(C, A);
  let nvec = cross(ab, ac);
  const nlen = norm(nvec);
  if (nlen < 1e-10) return null;
  let n = scale(nvec, 1 / nlen);
  if (dot(n, sub(V, A)) < 0) n = scale(n, -1);

  const u = normalize(ab);
  const w = normalize(cross(n, u));

  const to2 = (P: Vec3): [number, number] => {
    const ap = sub(P, A);
    return [dot(ap, u), dot(ap, w)];
  };

  const a2 = to2(A);
  const b2 = to2(B);
  const c2 = to2(C);
  const cc = circumcenter2D(a2, b2, c2);
  if (!cc) return null;

  const R = Math.max(
    Math.hypot(a2[0] - cc[0], a2[1] - cc[1]),
    Math.hypot(b2[0] - cc[0], b2[1] - cc[1]),
    Math.hypot(c2[0] - cc[0], c2[1] - cc[1]),
  );
  if (R < 1e-8) return null;

  const O: Vec3 = [
    A[0] + u[0] * cc[0] + w[0] * cc[1],
    A[1] + u[1] * cc[0] + w[1] * cc[1],
    A[2] + u[2] * cc[0] + w[2] * cc[1],
  ];

  const nSeg = 48;
  const xi: number[] = [];
  const yi: number[] = [];
  const zi: number[] = [];
  xi.push(V[0]);
  yi.push(V[1]);
  zi.push(V[2]);
  for (let j = 0; j < nSeg; j++) {
    const th = (2 * Math.PI * j) / nSeg;
    xi.push(O[0] + R * (Math.cos(th) * u[0] + Math.sin(th) * w[0]));
    yi.push(O[1] + R * (Math.cos(th) * u[1] + Math.sin(th) * w[1]));
    zi.push(O[2] + R * (Math.cos(th) * u[2] + Math.sin(th) * w[2]));
  }
  const I: number[] = [];
  const J: number[] = [];
  const K: number[] = [];
  for (let j = 0; j < nSeg; j++) {
    const j2 = (j + 1) % nSeg;
    I.push(0);
    J.push(1 + j);
    K.push(1 + j2);
  }

  return {
    type: 'mesh3d',
    x: xi,
    y: yi,
    z: zi,
    i: I,
    j: J,
    k: K,
    opacity: typeof src.opacity === 'number' ? src.opacity : 0.45,
    color: src.color || '#22d3ee',
    name: src.name || '圓錐側面',
    lighting: src.lighting || { ambient: 0.85, diffuse: 0.55 },
    showscale: false,
  };
}

function maybeReplaceTriangularConeMesh(trace: any, ctxText: string): any {
  if (!coneHint(ctxText)) return trace;
  if (trace?.type !== 'mesh3d') return trace;
  const xv = trace.x;
  const yv = trace.y;
  const zv = trace.z;
  if (!Array.isArray(xv) || xv.length !== 4 || yv?.length !== 4 || zv?.length !== 4) return trace;
  const rebuilt = buildConeFromFourVertices(xv, yv, zv, trace);
  return rebuilt || trace;
}

/**
 * 在送進 Plotly 前修正 traces（純函式、可重複呼叫）。
 */
export function patchStem3dPlotlyTraces(
  traces: any[],
  opts?: { title?: string; caption?: string; explanation?: string },
): any[] {
  if (!Array.isArray(traces) || traces.length === 0) return traces;

  const ctxText = collectContext(traces, opts?.title, opts?.caption, opts?.explanation);
  let out = traces.map((t) => maybeReplaceTriangularConeMesh(t, ctxText));

  const addRev =
    revolutionHint(ctxText) && !hasDenseMesh3d(out) && out.some((t) => isGeneratrixScatter3d(t));

  if (addRev) {
    const gen = out.find((t) => isGeneratrixScatter3d(t));
    if (gen) {
      const surf = revolutionSurfaceFromGeneratrix(gen);
      if (surf) {
        out = [surf, ...out];
      }
    }
  }

  return out;
}
