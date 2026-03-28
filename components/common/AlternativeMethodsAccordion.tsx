import React, { useState } from 'react';
import type { AlternativeMethod } from '../../types';
import { SmartChemText } from '../VisualizationRenderer';

/**
 * 全科目共用的「一題多解」摺疊面板（數學／物理／化學等 DRY）
 * 使用 state + 條件渲染取代原生 <details>，避免收合時寬高為 0 導致 PhysicsRenderer／LatexRenderer 展開瞬間排版坍縮。
 */
export const AlternativeMethodsAccordion: React.FC<{
  methods: AlternativeMethod[];
  /** 題組多列時避免與他列摺疊 state／index 混淆，供 React key 前綴 */
  keyPrefix?: string;
}> = ({ methods, keyPrefix = '' }) => {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => {
    setOpenMap(prev => ({ ...prev, [i]: !prev[i] }));
  };

  if (!methods?.length) return null;
  const rowKey = keyPrefix ? `${keyPrefix}-` : '';
  return (
    <div className="space-y-2">
      {methods.map((m, i) => {
        const isOpen = !!openMap[i];
        return (
          <div
            key={`${rowKey}alt-method-${i}`}
            className="border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] overflow-hidden transition-colors"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              className="w-full cursor-pointer px-4 py-3 font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 hover:bg-[var(--bg-card)] text-left"
              onClick={() => toggle(i)}
            >
              <span className="text-base shrink-0" aria-hidden>
                💡
              </span>
              <span className="min-w-0 break-words">
                其他解法：{m.method_name || `方法 ${i + 1}`}
              </span>
              <span
                className={`ml-auto text-[10px] text-[var(--text-secondary)] opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              >
                ▼
              </span>
            </button>
            {isOpen ? (
              <div className="px-4 pb-4 pt-0 border-t border-[var(--border-color)] space-y-3 text-sm text-[var(--text-primary)]">
                {m.description ? (
                  <div className="leading-relaxed pt-3">
                    <SmartChemText text={m.description} />
                  </div>
                ) : null}
                {Array.isArray(m.steps) && m.steps.length > 0 && (
                  <ol className="list-decimal pl-5 space-y-2 text-[var(--text-primary)]">
                    {m.steps.map((step, j) => (
                      <li key={j} className="leading-relaxed pl-1">
                        <SmartChemText text={typeof step === 'string' ? step : String(step)} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default AlternativeMethodsAccordion;
