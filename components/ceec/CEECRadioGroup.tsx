import React from 'react';

export interface CEECRadioGroupProps {
  options: string[];
  correctIndices: number[];
  showSolution?: boolean;
}

/** 大考擬真單選：圓形選取與錯誤選項反灰 */
export const CEECRadioGroup: React.FC<CEECRadioGroupProps> = ({
  options,
  correctIndices,
  showSolution = true,
}) => {
  const correctSet = new Set(
    Array.isArray(correctIndices) ? correctIndices.filter((i) => Number.isInteger(i) && i >= 0) : []
  );

  return (
    <div className="space-y-2.5" role="radiogroup" aria-label="擬真單選題作答區">
      {options.map((label, i) => {
        const isCorrect = correctSet.has(i);
        const isWrong = showSolution && !isCorrect;
        return (
          <div
            key={i}
            role="radio"
            aria-checked={showSolution ? isCorrect : undefined}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              showSolution && isCorrect
                ? 'border-emerald-500/50 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30'
                : 'border-[var(--border-color)] bg-[var(--bg-card)]'
            } ${isWrong ? 'opacity-45 cursor-not-allowed' : ''}`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border-color)] ${
                showSolution && isCorrect ? 'border-emerald-500 bg-emerald-500/20' : ''
              }`}
              aria-hidden
            >
              {showSolution && isCorrect ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> : null}
            </span>
            <span className="text-sm leading-snug text-[var(--text-primary)]">{label}</span>
          </div>
        );
      })}
    </div>
  );
};
