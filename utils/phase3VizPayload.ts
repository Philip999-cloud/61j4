import type {
  Phase2ChemSmiles2DPayload,
  Phase2CircuitSchematicPayload,
  Phase2EarthCelestialPayload,
  Phase2EarthContourPayload,
  Phase2EnergyLevelPayload,
  Phase2PeriodicHighlightPayload,
  Phase2FreeBodyForcesPayload,
  Phase2MermaidPayload,
  Phase2PedigreePayload,
  Phase2PunnettPayload,
  Phase2MoonPhase,
  Phase3ChemAromaticPayload,
  Phase3SnellPayload,
  Phase3StemXYChartPayload,
  Phase3WaveInterferencePayload,
} from '../types';

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function numArr(v: unknown, maxLen: number): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (let i = 0; i < v.length && out.length < maxLen; i++) {
    const n = Number(v[i]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function intArr01(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const s = new Set<number>();
  for (const x of v) {
    const n = Math.floor(Number(x));
    if (n >= 0 && n <= 5) s.add(n);
  }
  return [...s];
}

export function parsePhase3ChemAromatic(viz: Record<string, unknown>): Phase3ChemAromaticPayload | null {
  const ring = viz.ring;
  if (ring !== 'benzene' && ring !== 'pyridine') return null;
  const lp =
    viz.lone_pair_on_vertices != null
      ? intArr01(viz.lone_pair_on_vertices)
      : viz.lonePairOnVertices != null
        ? intArr01(viz.lonePairOnVertices)
        : [];
  return { ring, lone_pair_on_vertices: lp.length ? lp : undefined };
}

export function parsePhase3WaveInterference(viz: Record<string, unknown>): Phase3WaveInterferencePayload | null {
  const phase = viz.phase_offset_rad ?? viz.phaseOffsetRad;
  const amp = viz.amplitude;
  const label = typeof viz.label === 'string' ? viz.label : undefined;
  return {
    phase_offset_rad: phase !== undefined ? num(phase, 0) : undefined,
    amplitude: amp !== undefined ? num(amp, 28) : undefined,
    label,
  };
}

export function parsePhase3Snell(viz: Record<string, unknown>): Phase3SnellPayload | null {
  const r1 = viz.refracted_deg !== undefined ? Number(viz.refracted_deg) : viz.refractedDeg !== undefined ? Number(viz.refractedDeg) : undefined;
  return {
    n1: viz.n1 !== undefined ? num(viz.n1, 1) : undefined,
    n2: viz.n2 !== undefined ? num(viz.n2, 1.33) : undefined,
    incident_deg: viz.incident_deg !== undefined ? num(viz.incident_deg, 40) : viz.incidentDeg !== undefined ? num(viz.incidentDeg, 40) : undefined,
    refracted_deg: r1 !== undefined && Number.isFinite(r1) ? r1 : undefined,
  };
}

export function parsePhase3StemXY(viz: Record<string, unknown>): Phase3StemXYChartPayload | null {
  const kind = viz.chart_kind ?? viz.chartKind;
  if (kind !== 'line' && kind !== 'scatter') return null;
  const x = numArr(viz.x, 512);
  const y = numArr(viz.y, 512);
  if (x.length < 2 || y.length < 2) return null;
  const n = Math.min(x.length, y.length);
  return {
    chart_kind: kind,
    x: x.slice(0, n),
    y: y.slice(0, n),
    x_axis_title:
      typeof viz.x_axis_title === 'string'
        ? viz.x_axis_title
        : typeof viz.xAxisTitle === 'string'
          ? viz.xAxisTitle
          : undefined,
    y_axis_title:
      typeof viz.y_axis_title === 'string'
        ? viz.y_axis_title
        : typeof viz.yAxisTitle === 'string'
          ? viz.yAxisTitle
          : undefined,
  };
}

/** 滴定曲線等：不要求 chart_kind，固定為 line */
export function parseTitrationCurve(viz: Record<string, unknown>): Phase3StemXYChartPayload | null {
  const x = numArr(viz.x, 512);
  const y = numArr(viz.y, 512);
  if (x.length < 2 || y.length < 2) return null;
  const n = Math.min(x.length, y.length);
  return {
    chart_kind: 'line',
    x: x.slice(0, n),
    y: y.slice(0, n),
    x_axis_title:
      typeof viz.x_axis_title === 'string'
        ? viz.x_axis_title
        : typeof viz.xAxisTitle === 'string'
          ? viz.xAxisTitle
          : undefined,
    y_axis_title:
      typeof viz.y_axis_title === 'string'
        ? viz.y_axis_title
        : typeof viz.yAxisTitle === 'string'
          ? viz.yAxisTitle
          : undefined,
  };
}

const MOON_PHASES: Phase2MoonPhase[] = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

export function parseFreeBodyForces(viz: Record<string, unknown>): Phase2FreeBodyForcesPayload | null {
  const forcesRaw = viz.forces;
  if (!Array.isArray(forcesRaw) || forcesRaw.length === 0) return null;
  const forces: Phase2FreeBodyForcesPayload['forces'] = [];
  for (const f of forcesRaw) {
    if (!f || typeof f !== 'object') continue;
    const o = f as Record<string, unknown>;
    const name =
      typeof o.name === 'string' && o.name.trim()
        ? o.name.trim()
        : typeof o.label === 'string' && o.label.trim()
          ? o.label.trim()
          : '';
    if (!name) continue;
    const magnitude = num(o.magnitude ?? o.mag ?? 1, 1);
    const angle = num(o.angle ?? o.angle_deg ?? o.angleDeg ?? 0, 0);
    forces.push({ name, magnitude, angle });
  }
  if (forces.length === 0) return null;
  const sh = viz.objectShape ?? viz.object_shape;
  const objectShape =
    sh === 'circle' || sh === 'dot' || sh === 'box' ? sh : undefined;
  return { forces, objectShape };
}

export function parseCircuitSchematic(viz: Record<string, unknown>): Phase2CircuitSchematicPayload | null {
  const raw = viz.elements ?? viz.series;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const elements: Phase2CircuitSchematicPayload['elements'] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const k = o.kind ?? o.type;
    if (k !== 'battery' && k !== 'resistor' && k !== 'ammeter') continue;
    elements.push({
      kind: k,
      label: typeof o.label === 'string' ? o.label : undefined,
      value:
        typeof o.value === 'string'
          ? o.value
          : o.value != null && Number.isFinite(Number(o.value))
            ? String(o.value)
            : undefined,
    });
  }
  return elements.length > 0 ? { elements } : null;
}

export function parseChemSmiles2D(viz: Record<string, unknown>): Phase2ChemSmiles2DPayload | null {
  const smiles =
    typeof viz.smiles === 'string'
      ? viz.smiles.trim()
      : typeof viz.smiles_string === 'string'
        ? viz.smiles_string.trim()
        : '';
  if (!smiles) return null;
  const idxRaw = viz.lone_pair_atom_indices ?? viz.lonePairAtomIndices;
  const lone_pair_atom_indices: number[] = [];
  if (Array.isArray(idxRaw)) {
    for (const x of idxRaw) {
      const n = Math.floor(Number(x));
      if (Number.isFinite(n) && n >= 0) lone_pair_atom_indices.push(n);
    }
  }
  const markersRaw = viz.lone_pair_markers ?? viz.lonePairMarkers;
  const lone_pair_markers: Phase2ChemSmiles2DPayload['lone_pair_markers'] = [];
  if (Array.isArray(markersRaw)) {
    for (const m of markersRaw) {
      if (!m || typeof m !== 'object') continue;
      const o = m as Record<string, unknown>;
      const x = Number(o.x);
      const y = Number(o.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const c = o.count;
      const count = c === 2 ? 2 : 1;
      lone_pair_markers.push({
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
        count,
      });
    }
  }
  return {
    smiles,
    lone_pair_atom_indices: lone_pair_atom_indices.length ? lone_pair_atom_indices : undefined,
    lone_pair_markers: lone_pair_markers.length ? lone_pair_markers : undefined,
  };
}

function strGametes(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === 'string' && x.trim()) out.push(x.trim());
  }
  return out;
}

export function parsePunnettSquare(viz: Record<string, unknown>): Phase2PunnettPayload | null {
  const p1 = strGametes(viz.parent1_gametes ?? viz.parent_1_gametes);
  const p2 = strGametes(viz.parent2_gametes ?? viz.parent_2_gametes);
  if (p1.length === 0 || p2.length === 0) return null;
  return { parent1_gametes: p1, parent2_gametes: p2 };
}

export function parsePedigree(viz: Record<string, unknown>): Phase2PedigreePayload | null {
  const nodesRaw = viz.nodes;
  const edgesRaw = viz.edges;
  if (!Array.isArray(nodesRaw) || nodesRaw.length === 0) return null;
  if (!Array.isArray(edgesRaw)) return null;
  const nodes: Phase2PedigreePayload['nodes'] = [];
  for (const n of nodesRaw) {
    if (!n || typeof n !== 'object') continue;
    const o = n as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    if (!id) continue;
    const g = o.gender;
    const gender =
      g === 'male' || g === 'female' || g === 'unknown' ? g : undefined;
    nodes.push({
      id,
      gender,
      affected: typeof o.affected === 'boolean' ? o.affected : undefined,
    });
  }
  const edges: Phase2PedigreePayload['edges'] = [];
  for (const e of edgesRaw) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const from = typeof o.from === 'string' ? o.from.trim() : '';
    const to = typeof o.to === 'string' ? o.to.trim() : '';
    if (from && to) edges.push({ from, to });
  }
  return nodes.length > 0 && edges.length > 0 ? { nodes, edges } : null;
}

export function parseMermaidFlowchart(viz: Record<string, unknown>): Phase2MermaidPayload | null {
  const def =
    typeof viz.definition === 'string'
      ? viz.definition.trim()
      : typeof viz.mermaid === 'string'
        ? viz.mermaid.trim()
        : '';
  if (!def || def.length > 8000) return null;
  return { definition: def };
}

export function parseEarthCelestial(viz: Record<string, unknown>): Phase2EarthCelestialPayload | null {
  const mp = viz.moon_phase ?? viz.moonPhase;
  const moon_phase =
    typeof mp === 'string' && (MOON_PHASES as string[]).includes(mp) ? (mp as Phase2MoonPhase) : undefined;
  const caption = typeof viz.caption === 'string' ? viz.caption : undefined;
  if (!moon_phase && !caption?.trim()) return null;
  return { moon_phase, caption };
}

export function parseEarthContour(viz: Record<string, unknown>): Phase2EarthContourPayload | null {
  const iso = viz.isolines ?? viz.contours;
  if (!Array.isArray(iso) || iso.length === 0) return null;
  const isolines: Phase2EarthContourPayload['isolines'] = [];
  for (const line of iso) {
    if (!line || typeof line !== 'object') continue;
    const o = line as Record<string, unknown>;
    const pts = o.points;
    if (!Array.isArray(pts) || pts.length < 2) continue;
    const points: [number, number][] = [];
    for (const p of pts) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const a = Number(p[0]);
      const b = Number(p[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) points.push([a, b]);
    }
    if (points.length >= 2) {
      const val = o.value !== undefined ? Number(o.value) : undefined;
      isolines.push({
        points,
        value: val !== undefined && Number.isFinite(val) ? val : undefined,
      });
    }
  }
  if (isolines.length === 0) return null;
  const xr = viz.x_range ?? viz.xRange;
  const yr = viz.y_range ?? viz.yRange;
  const x_range =
    Array.isArray(xr) && xr.length === 2
      ? ([num(xr[0], 0), num(xr[1], 1)] as [number, number])
      : undefined;
  const y_range =
    Array.isArray(yr) && yr.length === 2
      ? ([num(yr[0], 0), num(yr[1], 1)] as [number, number])
      : undefined;
  return { isolines, x_range, y_range };
}

function normalizeElementSymbol(s: string): string | null {
  const t = s.trim();
  if (!t || t.length > 3) return null;
  if (!/^[A-Za-z]+$/.test(t)) return null;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function parseEnergyLevelDiagram(viz: Record<string, unknown>): Phase2EnergyLevelPayload | null {
  const raw = viz.levels;
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const levels: Phase2EnergyLevelPayload['levels'] = [];
  for (const L of raw) {
    if (!L || typeof L !== 'object') continue;
    const o = L as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    if (!label) continue;
    const e = o.energy !== undefined ? Number(o.energy) : undefined;
    levels.push({
      label,
      energy: e !== undefined && Number.isFinite(e) ? e : undefined,
    });
  }
  if (levels.length < 2) return null;
  const transRaw = viz.transitions;
  const transitions: NonNullable<Phase2EnergyLevelPayload['transitions']> = [];
  if (Array.isArray(transRaw)) {
    for (const t of transRaw) {
      if (!t || typeof t !== 'object') continue;
      const o = t as Record<string, unknown>;
      const fi = Math.floor(Number(o.from_index ?? o.fromIndex));
      const ti = Math.floor(Number(o.to_index ?? o.toIndex));
      if (!Number.isFinite(fi) || !Number.isFinite(ti)) continue;
      const lab = typeof o.label === 'string' ? o.label : undefined;
      transitions.push({ from_index: fi, to_index: ti, label: lab });
    }
  }
  const sort_by_energy = viz.sort_by_energy === false ? false : true;
  return {
    levels,
    transitions: transitions.length ? transitions : undefined,
    sort_by_energy,
  };
}

export function parsePeriodicTableHighlight(
  viz: Record<string, unknown>
): Phase2PeriodicHighlightPayload | null {
  const raw = viz.highlight_symbols ?? viz.highlightSymbols ?? viz.symbols;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const highlight_symbols: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const n = normalizeElementSymbol(x);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    highlight_symbols.push(n);
    if (highlight_symbols.length >= 24) break;
  }
  if (highlight_symbols.length === 0) return null;
  const title = typeof viz.title === 'string' ? viz.title : undefined;
  return { highlight_symbols, title };
}
