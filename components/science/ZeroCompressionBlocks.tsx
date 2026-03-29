import React from 'react';
import type { ZeroCompressionSteps } from '../../types';
import LatexRenderer from '../LatexRenderer';

const STEP_META: { key: keyof ZeroCompressionSteps; title: string; dot: string }[] = [
  { key: 'given', title: '已知', dot: 'bg-sky-500' },
  { key: 'formula', title: '公式', dot: 'bg-violet-500' },
  { key: 'substitute', title: '代入', dot: 'bg-amber-500' },
  { key: 'derive', title: '推導', dot: 'bg-pink-500' },
  { key: 'answer', title: '解答', dot: 'bg-emerald-500' },
];

/** 與 stemPhase3DisplayNormalize 的敘述欄位展開一致：模型若回傳巢狀物件，仍應顯示而非空白。 */
function zeroCompressionStepDisplayText(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    const parts = val.map((x) => zeroCompressionStepDisplayText(x)).filter((s) => s.length > 0);
    return parts.join('\n\n');
  }
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return keys.map((k) => `**${k}**\n${zeroCompressionStepDisplayText(o[k])}`).join('\n\n');
  }
  return String(val);
}

export function zeroCompressionHasContent(z?: ZeroCompressionSteps | null): boolean {
  if (!z || typeof z !== 'object') return false;
  return STEP_META.some(({ key }) => zeroCompressionStepDisplayText(z[key]).length > 0);
}

interface Props {
  steps: ZeroCompressionSteps;
  isSolutionOnly?: boolean;
}

export const ZeroCompressionBlocks: React.FC<Props> = ({ steps, isSolutionOnly }) => {
  return (
    <div className="mt-8 relative z-10 bg-[var(--bg-main)] p-6 rounded-[2rem] border border-[var(--border-color)] transition-colors">
      <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-pink-500" />
        {isSolutionOnly ? '標準演算流程（五段式）' : '參考詳解（五段式 · 零跳步）'}
      </h5>
      <div className="space-y-4">
        {STEP_META.map(({ key, title, dot }) => {
          const raw = steps[key];
          const text = zeroCompressionStepDisplayText(raw);
          return (
            <div
              key={key}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-inner transition-colors"
            >
              <h6 className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {title}
              </h6>
              <div className="font-serif text-[var(--text-primary)] text-base leading-loose">
                {text ? (
                  <LatexRenderer content={text} />
                ) : (
                  <span className="text-sm text-[var(--text-secondary)] italic">（此段無內容）</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
