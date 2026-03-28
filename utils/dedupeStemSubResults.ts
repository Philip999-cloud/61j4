/**
 * 主席綜評回傳的 stem_sub_results 偶含重複 sub_id（例如 29、29、30）。
 * 依題號去重：保留內容較完整的一筆，順序維持「每個 sub_id 第一次出現」的題序。
 */

function stemSubContentScore(sub: Record<string, unknown>): number {
  return (
    String(sub.feedback ?? '').length +
    String(sub.correct_calculation ?? '').length
  );
}

export function dedupeStemSubResultsBySubId<T extends Record<string, unknown>>(stems: T[]): T[] {
  if (!Array.isArray(stems) || stems.length < 2) return stems;

  const bestById = new Map<string, T>();
  for (const sub of stems) {
    if (!sub || typeof sub !== 'object') continue;
    const sidRaw = sub.sub_id;
    if (sidRaw == null || String(sidRaw).trim() === '') continue;
    const key = String(sidRaw).trim();
    const prev = bestById.get(key);
    if (!prev || stemSubContentScore(sub) >= stemSubContentScore(prev)) {
      bestById.set(key, sub);
    }
  }

  const out: T[] = [];
  const emitted = new Set<string>();
  for (const sub of stems) {
    if (!sub || typeof sub !== 'object') {
      out.push(sub);
      continue;
    }
    const sidRaw = sub.sub_id;
    if (sidRaw == null || String(sidRaw).trim() === '') {
      out.push(sub);
      continue;
    }
    const key = String(sidRaw).trim();
    if (emitted.has(key)) continue;
    emitted.add(key);
    out.push(bestById.get(key) ?? sub);
  }
  return out;
}
