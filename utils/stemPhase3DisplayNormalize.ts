/**
 * Phase 3 回傳給前端的顯示前正規化：unwrap 字串化 visualization_code、生物科敘述欄位字串化。
 * 不影響配分欄位與轉錄流程。
 */

function coerceDisplayString(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    const parts = val.map((x) => coerceDisplayString(x)).filter((s) => s.trim());
    return parts.join('\n\n');
  }
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return keys.map((k) => `**${k}**\n${coerceDisplayString(o[k])}`).join('\n\n');
  }
  return String(val);
}

/** 若模型將 visualization_code 以 JSON 字串回傳，解析為物件供 UI 合併幾何／濾圖 */
export function unwrapVisualizationCodeIfString(sub: Record<string, unknown>): void {
  const vc = sub.visualization_code;
  if (typeof vc !== 'string' || !vc.trim()) return;
  let s = vc.trim().replace(/```json\n?|```/gi, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  try {
    const p = JSON.parse(s) as unknown;
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      sub.visualization_code = p as Record<string, unknown>;
    }
  } catch {
    /* 保留原字串，交由 VisualizationRenderer 字串分支處理 */
  }
}

const STEM_TEXT_FIELDS = [
  'feedback',
  'concept_correction',
  'correct_calculation',
  'internal_verification',
  'scientific_notation_and_units',
] as const;

function coerceBiologyStemSubTextFields(sub: Record<string, unknown>): void {
  for (const k of STEM_TEXT_FIELDS) {
    const v = sub[k];
    if (typeof v !== 'string' && v != null) {
      const out = coerceDisplayString(v);
      if (out) sub[k] = out;
    }
  }
  const zc = sub.zero_compression;
  if (zc && typeof zc === 'object' && !Array.isArray(zc)) {
    const z = zc as Record<string, unknown>;
    for (const zk of ['given', 'formula', 'substitute', 'derive', 'answer'] as const) {
      const v = z[zk];
      if (typeof v !== 'string' && v != null) {
        const out = coerceDisplayString(v);
        if (out) z[zk] = out;
      }
    }
  }
}

/**
 * 在 dedupeStemSubResultsBySubId 之後呼叫。對所有子題 unwrap visualization_code；僅生物科額外字串化敘述欄位。
 */
export function normalizePhase3StemSubResultsForDisplay(
  parsed: unknown,
  subjectName: string,
): void {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
  const root = parsed as Record<string, unknown>;
  const isBio = /生物|biology/i.test(subjectName || '');
  if (isBio && typeof root.remarks_zh !== 'string' && root.remarks_zh != null) {
    const out = coerceDisplayString(root.remarks_zh);
    if (out) root.remarks_zh = out;
  }
  const stems = root.stem_sub_results;
  if (!Array.isArray(stems)) return;
  for (const raw of stems) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const sub = raw as Record<string, unknown>;
    unwrapVisualizationCodeIfString(sub);
    if (isBio) coerceBiologyStemSubTextFields(sub);
  }
}
