import React from 'react';

export interface CEECCheckboxGroupProps {
  options: string[];
  correctIndices: number[];
  showSolution?: boolean;
}

/** 大考擬真多選：方形核取與錯誤選項反灰 */
export const CEECCheckboxGroup: React.FC<CEECCheckboxGroupProps> = ({
  options,
  correctIndices,
  showSolution = true,
}) => {
  const correctSet = new Set(
    Array.isArray(correctIndices) ? correctIndices.filter((i) => Number.isInteger(i) && i >= 0) : []
  );

  return (
    <div className="space-y-2.5" role="group" aria-label="擬真多選題作答區">
      {options.map((label, i) => {
        const isCorrect = correctSet.has(i);
        const isWrong = showSolution && !isCorrect;
        return (
          <div
            key={i}
            role="checkbox"
            aria-checked={showSolution ? isCorrect : undefined}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              showSolution && isCorrect
                ? 'border-emerald-500/50 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30'
                : 'border-[var(--border-color)] bg-[var(--bg-card)]'
            } ${isWrong ? 'opacity-45 cursor-not-allowed' : ''}`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-[var(--border-color)] ${
                showSolution && isCorrect ? 'border-emerald-500 bg-emerald-500/20' : ''
              }`}
              aria-hidden
            >
              {showSolution && isCorrect ? (
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">✓</span>
              ) : null}
            </span>
            <span className="text-sm leading-snug text-[var(--text-primary)]">{label}</span>
          </div>
        );
      })}
    </div>
  );
};
