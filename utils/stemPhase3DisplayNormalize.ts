/**
 * Phase 3 回傳給前端的顯示前正規化：unwrap 字串化 visualization_code、生物科敘述欄位字串化。
 * 不影響配分欄位與轉錄流程。
 */

import { plotlyDataLooksRenderable } from './validateStemVisualization';

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

function plotlyChartTraceListEmpty(v: Record<string, unknown>): boolean {
  const d = v.data;
  if (d == null) return true;
  if (Array.isArray(d) && d.length === 0) return true;
  if (typeof d === 'object' && !Array.isArray(d) && !plotlyDataLooksRenderable(d)) return true;
  return false;
}

/** Flash／schema 截斷常留下 plotly_chart 空 data；標準詳解路徑先前未修，UI 僅剩 Visual Reasoning 文字 */
function repairVisualizationCodePlotlyItems(
  vcObj: Record<string, unknown>,
  subjectName: string,
): void {
  const isPhysics = /物理|physics/i.test(subjectName || '');
  const vizArr = vcObj.visualizations;
  if (Array.isArray(vizArr)) {
    for (const item of vizArr as Record<string, unknown>[]) {
      if (item.type !== 'plotly_chart') continue;
      if (plotlyChartTraceListEmpty(item)) {
        if (Array.isArray(item.x) && Array.isArray(item.y) && item.x.length > 0) {
          item.data = [
            {
              type: 'scatter',
              mode: 'lines+markers',
              x: item.x,
              y: item.y,
              name: (typeof item.name === 'string' && item.name.trim()) || 'Data',
            },
          ];
        }
      }
      if (!plotlyChartTraceListEmpty(item)) continue;
      if (!isPhysics) continue;
      const expl = typeof vcObj.explanation === 'string' ? vcObj.explanation : '';
      const title = typeof item.title === 'string' ? item.title : '';
      const ctx = `${expl}\n${title}`;
      const isEnergyPartition =
        /動能|系統動能|能量分配|動能分配|內能|位能|機械能|kinetic|kinetic\s*energy|partition|\bKE\b/i.test(
          ctx,
        );
      const isMomentumLike =
        /動量|碰撞|向量圖|守恆|momentum|collision|impulse/i.test(ctx) ||
        (/向量/.test(ctx) && !/動能|能量分配|動能分配|系統動能/i.test(ctx));
      if (!isEnergyPartition && !isMomentumLike) continue;
      const injectKind = isEnergyPartition ? 'energy_bar' : 'momentum_lines';
      // #region agent log
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4e4e43' },
        body: JSON.stringify({
          sessionId: '4e4e43',
          hypothesisId: 'H4',
          location: 'stemPhase3DisplayNormalize.ts:repairVisualizationCodePlotlyItems',
          message: 'injected minimal physics plotly traces',
          data: { injectKind, titleLen: title.length, explLen: expl.length },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (injectKind === 'energy_bar') {
        item.data = [
          {
            type: 'bar',
            x: ['物塊 A', '物塊 B'],
            y: [0.42, 0.58],
            name: '動能占比（示意）',
            marker: { color: ['#1565C0', '#D32F2F'] },
          },
        ];
        if (item.layout == null || typeof item.layout !== 'object' || Array.isArray(item.layout)) {
          item.layout = {
            showlegend: false,
            xaxis: { title: '' },
            yaxis: { title: '相對占比（示意）', rangemode: 'tozero' },
            margin: { t: 28 },
          };
        }
      } else {
        item.data = [
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: [0, 1.2],
            y: [0.25, 0.25],
            name: '碰前 p₁ 方向',
            line: { width: 4, color: '#1565C0' },
            marker: { size: 8 },
          },
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: [0, 0.15],
            y: [0, 0],
            name: '碰前 p₂≈0',
            line: { width: 3, color: '#64748b' },
            marker: { size: 6 },
          },
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: [0, -0.5],
            y: [0, 0.2],
            name: '碰後示意',
            line: { width: 4, color: '#D32F2F' },
            marker: { size: 8 },
          },
        ];
        if (item.layout == null || typeof item.layout !== 'object' || Array.isArray(item.layout)) {
          item.layout = {
            showlegend: true,
            xaxis: { title: 'x', zeroline: true },
            yaxis: { title: 'y', zeroline: true },
            margin: { t: 28 },
          };
        }
      }
    }
  }
  if (typeof vcObj.type === 'string' && vcObj.visualizations == null) {
    vcObj.visualizations = [{ ...vcObj }];
  }
}

function repairStemSubVisualizationCode(sub: Record<string, unknown>, subjectName: string): void {
  const vc = sub.visualization_code;
  if (!vc || typeof vc !== 'object' || Array.isArray(vc)) return;
  repairVisualizationCodePlotlyItems(vc as Record<string, unknown>, subjectName);
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
    repairStemSubVisualizationCode(sub, subjectName);
  }
}
