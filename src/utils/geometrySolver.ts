// src/utils/geometrySolver.ts
// Pure math solver: exact coordinates from constraints (v4). No AI pixel estimates.

import {
  computeLineIntersection,
  computePolygonArea,
  type Point,
} from './geometryMath';

/**
 * Optional: pick shaded polygon by matching area ratio to problem text (not vision).
 * MVP: enumerate 3–6 point subsets from vertices + interior intersections, convex hull, compare ratio.
 * Limitation: wrong for concave shaded regions; hull vertices must be in the candidate set.
 */
export type ShadedAreaConstraint =
  | { mode: 'ratio'; target: number; tolerance?: number }
  | {
      mode: 'absolute';
      shadedArea: number;
      figureArea: number;
      tolerance?: number;
    };

export interface SolvedGeometry {
  vertices: Array<{ id: string; x: number; y: number; label?: string }>;
  edges: Array<{ from: string; to: string; style?: 'solid' | 'dashed' }>;
  intersections: Array<{
    id: string;
    x: number;
    y: number;
    line1: [string, string];
    line2: [string, string];
  }>;
  shaded_regions: Array<{
    type: 'polygon';
    vertex_ids: string[];
    fill_color: string;
    opacity: number;
  }>;
  canvas_width: number;
  canvas_height: number;
}

export type ShadedRegionTopology =
  | { type: 'explicit'; vertex_ids: string[] }
  | {
      type: 'positional';
      position:
        | 'top'
        | 'top-right'
        | 'right'
        | 'bottom-right'
        | 'bottom'
        | 'bottom-left'
        | 'left'
        | 'top-left'
        | 'center'
        | 'upper-center'
        | 'lower-center';
    }
  | { type: 'topological'; bounded_by_lines: Array<[string, string]> };

export type DiagonalMode = 'all' | 'long_only' | 'some' | 'none';

function r(n: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function normSeg(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function segKey(a: string, b: string): string {
  const [x, y] = normSeg(a, b);
  return `${x}_${y}`;
}

/** Stable id for intersection of two undirected segments (vertex ids). */
function intersectionId(e1: [string, string], e2: [string, string]): string {
  const k1 = segKey(e1[0], e1[1]);
  const k2 = segKey(e2[0], e2[1]);
  return k1 < k2 ? `I_${k1}__${k2}` : `I_${k2}__${k1}`;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dedupePoints(
  pts: Array<{ p: Point; line1: [string, string]; line2: [string, string] }>,
  eps = 1e-4
): Array<{ p: Point; line1: [string, string]; line2: [string, string] }> {
  const out: typeof pts = [];
  for (const item of pts) {
    if (!out.some((o) => dist(o.p, item.p) < eps)) out.push(item);
  }
  return out;
}

function sortIdsByAngleAround(ids: string[], idToPt: Map<string, Point>, center: Point): string[] {
  return [...ids].sort((ia, ib) => {
    const pa = idToPt.get(ia);
    const pb = idToPt.get(ib);
    if (!pa || !pb) return 0;
    const aa = Math.atan2(pa.y - center.y, pa.x - center.x);
    const ab = Math.atan2(pb.y - center.y, pb.x - center.x);
    return aa - ab;
  });
}

function centroidOfPoints(pts: Point[]): Point {
  if (pts.length === 0) return { x: 0, y: 0 };
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  return { x: sx / pts.length, y: sy / pts.length };
}

/** Hexagon long diagonals (through center). */
const HEX_LONG: Array<[string, string]> = [
  ['A', 'D'],
  ['B', 'E'],
  ['C', 'F'],
];

const HEX_SHORT: Array<[string, string]> = [
  ['A', 'C'],
  ['A', 'E'],
  ['B', 'D'],
  ['B', 'F'],
  ['C', 'E'],
  ['D', 'F'],
];

const HEX_VERTEX_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

function hexDiagonals(
  mode: DiagonalMode,
  specific: Array<[string, string]> | null | undefined
): Array<[string, string]> {
  if (mode === 'none') return [];
  if (mode === 'long_only') return [...HEX_LONG];
  if (mode === 'some') {
    const pairs = (specific ?? []).map(([a, b]) => normSeg(a, b) as [string, string]);
    return pairs;
  }
  return [...HEX_LONG, ...HEX_SHORT];
}

/**
 * All non-adjacent vertex pairs for n-gon with labels[0]..labels[n-1] in order (excluding edges).
 */
function allDiagonalsForPolygon(labels: string[], n: number): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      out.push(normSeg(labels[i], labels[j]) as [string, string]);
    }
  }
  return out;
}

function longDiagonalsForPolygon(labels: string[], n: number): Array<[string, string]> {
  if (n % 2 !== 0) return [];
  const half = n / 2;
  const out: Array<[string, string]> = [];
  for (let i = 0; i < half; i++) {
    out.push(normSeg(labels[i], labels[i + half]) as [string, string]);
  }
  return out;
}

function polygonDiagonalEdges(
  labels: string[],
  n: number,
  mode: DiagonalMode,
  specific: Array<[string, string]> | null | undefined
): Array<[string, string]> {
  if (n === 6 && labels.slice(0, 6).join('') === 'ABCDEF') {
    return hexDiagonals(mode, specific);
  }
  if (mode === 'none') return [];
  if (mode === 'long_only') return longDiagonalsForPolygon(labels, n);
  if (mode === 'some') {
    return (specific ?? []).map(([a, b]) => normSeg(a, b) as [string, string]);
  }
  return allDiagonalsForPolygon(labels, n);
}

function boundaryEdges(labels: string[], n: number): Array<[string, string]> {
  const e: Array<[string, string]> = [];
  for (let i = 0; i < n; i++) {
    e.push(normSeg(labels[i], labels[(i + 1) % n]) as [string, string]);
  }
  return e;
}

function computeAllIntersections(
  verts: Record<string, Point>,
  segments: Array<[string, string]>,
  canvasCx: number,
  canvasCy: number,
  maxRadius: number
): SolvedGeometry['intersections'] {
  const raw: Array<{ p: Point; line1: [string, string]; line2: [string, string] }> = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i];
      const s2 = segments[j];
      const p1 = verts[s1[0]];
      const p2 = verts[s1[1]];
      const p3 = verts[s2[0]];
      const p4 = verts[s2[1]];
      if (!p1 || !p2 || !p3 || !p4) continue;
      const hit = computeLineIntersection(p1, p2, p3, p4);
      if (!hit) continue;
      const q = { x: r(hit.x), y: r(hit.y) };
      if (dist(q, { x: canvasCx, y: canvasCy }) > maxRadius * 1.55) continue;
      raw.push({ p: q, line1: s1, line2: s2 });
    }
  }

  const merged = dedupePoints(raw);
  const intersections: SolvedGeometry['intersections'] = [];
  const usedIds = new Set<string>();

  for (const { p, line1, line2 } of merged) {
    let id = intersectionId(line1, line2);
    if (dist(p, { x: canvasCx, y: canvasCy }) < 8) {
      id = 'O';
    }
    if (usedIds.has(id)) {
      let k = 1;
      while (usedIds.has(`${id}_${k}`)) k++;
      id = `${id}_${k}`;
    }
    usedIds.add(id);
    intersections.push({
      id,
      x: p.x,
      y: p.y,
      line1,
      line2,
    });
  }

  return intersections;
}

function nearestVertexId(p: Point, verts: Record<string, Point>, eps = 2.5): string | null {
  let best: string | null = null;
  let bestD = eps;
  for (const [id, vp] of Object.entries(verts)) {
    const d = dist(p, vp);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function nearestIntersectionId(
  p: Point,
  intersections: SolvedGeometry['intersections'],
  eps = 2.5
): string | null {
  let best: string | null = null;
  let bestD = eps;
  for (const it of intersections) {
    const d = dist(p, { x: it.x, y: it.y });
    if (d < bestD) {
      bestD = d;
      best = it.id;
    }
  }
  return best;
}

/** Map a computed point to vertex id, intersection id, or null. */
function resolvePointToId(
  p: Point,
  verts: Record<string, Point>,
  intersections: SolvedGeometry['intersections']
): string | null {
  const nv = nearestVertexId(p, verts);
  if (nv) return nv;
  const ni = nearestIntersectionId(p, intersections);
  if (ni) return ni;
  return null;
}

function resolvePointToPt(
  id: string,
  verts: Record<string, Point>,
  intersections: SolvedGeometry['intersections']
): Point | null {
  if (verts[id]) return verts[id];
  const it = intersections.find((x) => x.id === id);
  if (it) return { x: it.x, y: it.y };
  return null;
}

function cross2d(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Ray casting for simple polygons (convex hex is fine). */
function pointInPolygon(p: Point, poly: Point[]): boolean {
  const x = p.x;
  const y = p.y;
  let c = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x;
    const yi = poly[i]!.y;
    const xj = poly[j]!.x;
    const yj = poly[j]!.y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      c = !c;
    }
  }
  return c;
}

type TaggedPoint = { id: string; x: number; y: number };

function convexHullFromTagged(points: TaggedPoint[]): TaggedPoint[] {
  if (points.length <= 1) return points;
  const sorted = [...points].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
  const lower: TaggedPoint[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross2d(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: TaggedPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!;
    while (
      upper.length >= 2 &&
      cross2d(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  if (lower.length <= 1) return lower;
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function* eachCombination(ids: string[], k: number, start = 0, prefix: string[] = []): Generator<string[]> {
  if (prefix.length === k) {
    yield [...prefix];
    return;
  }
  for (let i = start; i < ids.length; i++) {
    yield* eachCombination(ids, k, i + 1, [...prefix, ids[i]!]);
  }
}

/**
 * Pick shaded polygon vertex ids by matching area(hexagon) ratio to problem constraints.
 * See ShadedAreaConstraint — does not use vision for region shape.
 */
function findShadedRegionByAreaConstraint(
  constraint: ShadedAreaConstraint,
  polygonVertexOrder: readonly string[],
  verts: Record<string, Point>,
  intersections: SolvedGeometry['intersections']
): string[] | null {
  const boundary: Point[] = polygonVertexOrder.map((id) => verts[id]).filter((p): p is Point => !!p);
  if (boundary.length < 3) return null;

  const totalArea = computePolygonArea(boundary);
  if (totalArea < 1e-10) return null;

  const targetRatio =
    constraint.mode === 'ratio'
      ? constraint.target
      : constraint.shadedArea / constraint.figureArea;
  const tol = constraint.tolerance ?? 0.05;

  const centroid = centroidOfPoints(boundary);
  const candidateSet = new Set<string>([...polygonVertexOrder]);
  for (const it of intersections) {
    const p = { x: it.x, y: it.y };
    // Include interior intersections; also near centroid (center O) — ray-cast can miss exact boundary cases.
    if (pointInPolygon(p, boundary) || dist(p, centroid) < 3) {
      candidateSet.add(it.id);
    }
  }
  const candidates = [...candidateSet];
  const idToPtForScore = new Map<string, Point>();
  for (const id of candidates) {
    const p = resolvePointToPt(id, verts, intersections);
    if (p) idToPtForScore.set(id, p);
  }

  /** Prefer polygons that include the hex center (typical shaded wedge uses center O). */
  function centerVertexCount(hullIds: string[]): number {
    let n = 0;
    for (const id of hullIds) {
      const p = idToPtForScore.get(id);
      if (p && dist(p, centroid) < 8) n++;
    }
    return n;
  }

  let best: { ids: string[]; err: number; k: number; centerN: number } | null = null;

  for (let k = 3; k <= 6; k++) {
    for (const combo of eachCombination(candidates, k)) {
      const tagged: TaggedPoint[] = [];
      for (const id of combo) {
        const p = resolvePointToPt(id, verts, intersections);
        if (p) tagged.push({ id, x: p.x, y: p.y });
      }
      if (tagged.length !== k) continue;

      const hull = convexHullFromTagged(tagged);
      if (hull.length < 3) continue;

      const area = computePolygonArea(hull.map((h) => ({ x: h.x, y: h.y })));
      if (area < 1e-8) continue;

      const ratio = area / totalArea;
      const err = Math.abs(ratio - targetRatio);
      if (err > tol) continue;

      const hullIds = hull.map((h) => h.id);
      const centerN = centerVertexCount(hullIds);

      if (best === null) {
        best = { ids: hullIds, err, k, centerN };
        continue;
      }

      if (err < best.err - 1e-12) {
        best = { ids: hullIds, err, k, centerN };
      } else if (Math.abs(err - best.err) < 1e-12) {
        if (centerN > best.centerN) {
          best = { ids: hullIds, err, k, centerN };
        } else if (centerN === best.centerN && k < best.k) {
          best = { ids: hullIds, err, k, centerN };
        }
      }
    }
  }

  return best?.ids ?? null;
}

function resolveBoundedByLines(
  lines: Array<[string, string]>,
  verts: Record<string, Point>,
  intersections: SolvedGeometry['intersections']
): string[] {
  if (lines.length < 2) return [];

  const idToPt = new Map<string, Point>();
  for (const [id, p] of Object.entries(verts)) {
    idToPt.set(id, p);
  }
  for (const inter of intersections) {
    idToPt.set(inter.id, { x: inter.x, y: inter.y });
  }

  const cornerPts: Point[] = [];
  const cornerIds: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const L1 = lines[i];
      const L2 = lines[j];
      const a1 = verts[L1[0]];
      const a2 = verts[L1[1]];
      const b1 = verts[L2[0]];
      const b2 = verts[L2[1]];
      if (!a1 || !a2 || !b1 || !b2) continue;
      const hit = computeLineIntersection(a1, a2, b1, b2);
      if (!hit) continue;
      const p = { x: r(hit.x), y: r(hit.y) };

      const id = resolvePointToId(p, verts, intersections);
      if (!id) continue;

      if (!cornerIds.includes(id)) {
        cornerIds.push(id);
        const pt = resolvePointToPt(id, verts, intersections);
        if (pt) cornerPts.push(pt);
      }
    }
  }

  if (cornerIds.length < 3) return [];

  const c = centroidOfPoints(cornerPts);
  return sortIdsByAngleAround(cornerIds, idToPt, c);
}

function resolveTopology(
  topology: ShadedRegionTopology,
  verts: Record<string, Point>,
  intersections: SolvedGeometry['intersections']
): string[] {
  if (topology.type === 'explicit') {
    return topology.vertex_ids;
  }
  if (topology.type === 'topological') {
    return resolveBoundedByLines(topology.bounded_by_lines, verts, intersections);
  }
  if (topology.type === 'positional') {
    const pos = topology.position;
    if (pos === 'top' || pos === 'upper-center') {
      return resolveBoundedByLines(
        [
          ['A', 'D'],
          ['B', 'F'],
          ['A', 'F'],
        ],
        verts,
        intersections
      );
    }
  }
  return [];
}

export function solveRegularHexagon(
  canvasWidth: number,
  canvasHeight: number,
  options: {
    shadedRegionTopology?: ShadedRegionTopology;
    shadedFillColor?: string;
    diagonalMode?: DiagonalMode;
    specificDiagonals?: Array<[string, string]> | null;
    shadedAreaConstraint?: ShadedAreaConstraint;
  } = {}
): SolvedGeometry {
  const W = canvasWidth;
  const H = canvasHeight;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.4;

  const vertexLabels = [...HEX_VERTEX_ORDER];
  const verts: Record<string, Point> = {};
  const vertices = vertexLabels.map((label, k) => {
    const angle = (k * Math.PI) / 3 - Math.PI / 2;
    const x = r(cx + R * Math.cos(angle));
    const y = r(cy + R * Math.sin(angle));
    verts[label] = { x, y };
    return { id: label, x, y, label };
  });

  const boundaryEdges = vertexLabels.map((v, i) => ({
    from: v,
    to: vertexLabels[(i + 1) % 6],
    style: 'solid' as const,
  }));

  const mode = options.diagonalMode ?? 'all';
  const diagPairs = hexDiagonals(mode, options.specificDiagonals);
  const diagonalEdges = diagPairs.map(([from, to]) => ({
    from,
    to,
    style: 'solid' as const,
  }));

  const segList: Array<[string, string]> = [
    ...boundaryEdges.map((e) => normSeg(e.from, e.to) as [string, string]),
    ...diagPairs,
  ];

  const intersections = computeAllIntersections(verts, segList, cx, cy, R);

  const shaded_regions: SolvedGeometry['shaded_regions'] = [];
  const fill = options.shadedFillColor ?? '#fef08a';
  let vertex_ids: string[] | null = null;

  if (options.shadedAreaConstraint) {
    vertex_ids = findShadedRegionByAreaConstraint(
      options.shadedAreaConstraint,
      vertexLabels,
      verts,
      intersections
    );
  }
  if ((!vertex_ids || vertex_ids.length < 3) && options.shadedRegionTopology) {
    vertex_ids = resolveTopology(options.shadedRegionTopology, verts, intersections);
  }
  if (vertex_ids && vertex_ids.length >= 3) {
    shaded_regions.push({
      type: 'polygon',
      vertex_ids,
      fill_color: fill,
      opacity: 0.75,
    });
  }

  return {
    vertices,
    edges: [...boundaryEdges, ...diagonalEdges],
    intersections,
    shaded_regions,
    canvas_width: W,
    canvas_height: H,
  };
}

/**
 * Regular n-gon. For n !== 6, diagonal mode "some" uses specificDiagonals; "all"/"long_only"/"none" supported.
 */
export function solveRegularPolygon(
  n: number,
  canvasWidth: number,
  canvasHeight: number,
  options: {
    diagonalMode?: DiagonalMode;
    specificDiagonals?: Array<[string, string]> | null;
    shadedRegionTopology?: ShadedRegionTopology;
    shadedFillColor?: string;
    shadedAreaConstraint?: ShadedAreaConstraint;
  } = {}
): SolvedGeometry {
  if (n === 6) {
    return solveRegularHexagon(canvasWidth, canvasHeight, {
      shadedRegionTopology: options.shadedRegionTopology,
      shadedFillColor: options.shadedFillColor,
      diagonalMode: options.diagonalMode ?? 'all',
      specificDiagonals: options.specificDiagonals,
      shadedAreaConstraint: options.shadedAreaConstraint,
    });
  }

  const W = canvasWidth;
  const H = canvasHeight;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.4;
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, n).split('');

  const verts: Record<string, Point> = {};
  const vertices = labels.map((label, k) => {
    const angle = (2 * Math.PI * k) / n - Math.PI / 2;
    const x = r(cx + R * Math.cos(angle));
    const y = r(cy + R * Math.sin(angle));
    verts[label] = { x, y };
    return { id: label, x, y, label };
  });

  const boundaryEdges = labels.map((v, i) => ({
    from: v,
    to: labels[(i + 1) % n],
    style: 'solid' as const,
  }));

  const mode = options.diagonalMode ?? 'all';
  const diagPairs = polygonDiagonalEdges(labels, n, mode, options.specificDiagonals);
  const diagonalEdges = diagPairs.map(([from, to]) => ({
    from,
    to,
    style: 'solid' as const,
  }));

  const segList: Array<[string, string]> = [
    ...boundaryEdges.map((e) => normSeg(e.from, e.to) as [string, string]),
    ...diagPairs,
  ];

  const intersections = computeAllIntersections(verts, segList, cx, cy, R);

  const shaded_regions: SolvedGeometry['shaded_regions'] = [];
  const fill = options.shadedFillColor ?? '#fef08a';
  let vertex_ids: string[] | null = null;

  if (options.shadedAreaConstraint) {
    vertex_ids = findShadedRegionByAreaConstraint(
      options.shadedAreaConstraint,
      labels,
      verts,
      intersections
    );
  }
  if ((!vertex_ids || vertex_ids.length < 3) && options.shadedRegionTopology) {
    vertex_ids = resolveTopology(options.shadedRegionTopology, verts, intersections);
  }
  if (vertex_ids && vertex_ids.length >= 3) {
    shaded_regions.push({
      type: 'polygon',
      vertex_ids,
      fill_color: fill,
      opacity: 0.75,
    });
  }

  return {
    vertices,
    edges: [...boundaryEdges, ...diagonalEdges],
    intersections,
    shaded_regions,
    canvas_width: W,
    canvas_height: H,
  };
}

export function solveCoordinatePlane(
  xRange: [number, number],
  yRange: [number, number],
  canvasWidth: number,
  canvasHeight: number
): { toSvgX: (x: number) => number; toSvgY: (y: number) => number; originSvg: Point } {
  const padding = 40;
  const xScale = (canvasWidth - 2 * padding) / (xRange[1] - xRange[0]);
  const yScale = (canvasHeight - 2 * padding) / (yRange[1] - yRange[0]);

  return {
    toSvgX: (x: number) => r(padding + (x - xRange[0]) * xScale),
    toSvgY: (y: number) => r(canvasHeight - padding - (y - yRange[0]) * yScale),
    originSvg: {
      x: r(padding + (0 - xRange[0]) * xScale),
      y: r(canvasHeight - padding - (0 - yRange[0]) * yScale),
    },
  };
}
