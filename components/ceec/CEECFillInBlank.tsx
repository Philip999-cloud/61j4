import React from 'react';

export interface CEECFillInBlankProps {
  lineCount: number;
  /** 每列可選提示（與列數對齊則顯示） */
  placeholders?: string[];
}

/** 填空／簡答：虛線底線＋手寫風格字級（純 Tailwind，不依賴全域 CSS） */
export const CEECFillInBlank: React.FC<CEECFillInBlankProps> = ({ lineCount, placeholders }) => {
  const n = Math.min(12, Math.max(1, Math.floor(lineCount) || 1));
  return (
    <div className="space-y-4" aria-label="擬真填空／簡答作答區">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex flex-col gap-1">
          {placeholders?.[i]?.trim() ? (
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">{placeholders[i]}</span>
          ) : null}
          <div
            className="w-full min-h-[2rem] border-b-2 border-dashed border-zinc-400/80 pb-1 dark:border-zinc-500/90 text-base italic font-serif text-[var(--text-primary)]"
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
};
