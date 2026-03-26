import type {
  MicroLessonArrow,
  MicroLessonSpec,
  MicroLessonStep,
  MicroLessonVariant,
} from '../types';

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function isSafeHexColor(s: unknown): s is string {
  return typeof s === 'string' && HEX.test(s.trim());
}

function asVariant(v: unknown): MicroLessonVariant | null {
  if (v === 'oxidation_timeline' || v === 'color_oscillation' || v === 'coordination_multiply') return v;
  return null;
}

function parseSteps(raw: unknown): MicroLessonStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 12) return null;
  const out: MicroLessonStep[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') return null;
    const o = row as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    if (!label) return null;
    const ox = Number(o.oxidation_state ?? o.oxidationState);
    if (!Number.isFinite(ox) || Math.abs(ox) > 20) return null;
    const species =
      typeof o.species === 'string' && o.species.trim() ? o.species.trim() : undefined;
    out.push({ label, species, oxidation_state: ox });
  }
  return out;
}

function parseArrows(raw: unknown, maxIndex: number): MicroLessonArrow[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw) || raw.length > 16) return undefined;
  const out: MicroLessonArrow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') return undefined;
    const o = row as Record<string, unknown>;
    const fi = Math.floor(Number(o.from_index ?? o.fromIndex));
    const ti = Math.floor(Number(o.to_index ?? o.toIndex));
    if (!Number.isInteger(fi) || !Number.isInteger(ti)) return undefined;
    if (fi < 0 || ti < 0 || fi > maxIndex || ti > maxIndex || fi === ti) return undefined;
    const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : undefined;
    out.push({ from_index: fi, to_index: ti, label });
  }
  return out.length ? out : undefined;
}

/**
 * 自 API／快取物件窄化為 MicroLessonSpec；無效則 null。
 */
export function parseMicroLesson(raw: unknown): MicroLessonSpec | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const variant = asVariant(o.variant);
  if (!variant) return null;

  const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim() : undefined;
  const caption = typeof o.caption === 'string' && o.caption.trim() ? o.caption.trim() : undefined;

  if (variant === 'oxidation_timeline') {
    const steps = parseSteps(o.steps);
    if (!steps) return null;
    const arrows = parseArrows(o.arrows, steps.length - 1);
    return { variant, title, caption, steps, arrows };
  }

  if (variant === 'color_oscillation') {
    const cf = o.color_from ?? o.colorFrom;
    const ct = o.color_to ?? o.colorTo;
    if (!isSafeHexColor(cf) || !isSafeHexColor(ct)) return null;
    return { variant, title, caption, color_from: cf.trim(), color_to: ct.trim() };
  }

  if (variant === 'coordination_multiply') {
    const bc = Math.floor(Number(o.bidentate_count ?? o.bidentateCount));
    const teeth = o.teeth_per_ligand != null || o.teethPerLigand != null
      ? Math.floor(Number(o.teeth_per_ligand ?? o.teethPerLigand))
      : 2;
    if (!Number.isInteger(bc) || bc < 1 || bc > 12) return null;
    if (!Number.isInteger(teeth) || teeth < 1 || teeth > 6) return null;
    let result = o.result_coordination != null || o.resultCoordination != null
      ? Math.floor(Number(o.result_coordination ?? o.resultCoordination))
      : bc * teeth;
    if (!Number.isInteger(result) || result < 1 || result > 24) result = bc * teeth;
    return {
      variant,
      title,
      caption,
      bidentate_count: bc,
      teeth_per_ligand: teeth,
      result_coordination: result,
    };
  }

  return null;
}
