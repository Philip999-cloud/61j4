import React from 'react';
import type { CeecAnswerGridSpec } from '../../types';

interface Props {
  grid: CeecAnswerGridSpec;
}

/**
 * 學測自然科式矩陣表：完整列×欄，✓ 標示標準答案勾選欄（唯讀擬真）。
 */
export const CEECAnswerGridTable: React.FC<Props> = ({ grid }) => {
  const rows = Array.isArray(grid.row_labels) ? grid.row_labels : [];
  const cols = Array.isArray(grid.col_labels) ? grid.col_labels : [];
  const sol = Array.isArray(grid.solution_checks_per_row) ? grid.solution_checks_per_row : [];

  if (rows.length === 0 || cols.length === 0) return null;

  return (
    <div className="mb-6 overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
      <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-3">
        題本勾選表（擬真重現）
      </h6>
      <table className="w-full border-collapse text-left text-[11px] text-[var(--text-primary)]">
        <thead>
          <tr>
            <th className="border border-zinc-400/50 dark:border-zinc-600 bg-[var(--bg-main)] px-2 py-2 font-black min-w-[4.5rem]">
              列／欄
            </th>
            {cols.map((c, j) => (
              <th
                key={j}
                className="border border-zinc-400/50 dark:border-zinc-600 bg-[var(--bg-main)] px-2 py-2 font-bold text-center align-middle max-w-[8rem]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border border-zinc-400/50 dark:border-zinc-600 px-2 py-2 font-semibold align-middle bg-[var(--bg-main)]/60">
                {r}
              </td>
              {cols.map((_, j) => {
                const pick = sol[i];
                const showCheck = pick != null && Number(pick) === j;
                return (
                  <td
                    key={j}
                    className="border border-zinc-400/50 dark:border-zinc-600 text-center align-middle p-2 min-h-[2.5rem]"
                  >
                    {showCheck ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-emerald-500/70 text-lg font-black text-emerald-600 dark:text-emerald-400" aria-label="標準答案勾選">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-zinc-400/70 dark:border-zinc-500 text-zinc-300 dark:text-zinc-600 text-xs" aria-hidden>
                        ○
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
        表格欄位應與題本一致；✓ 為參考解答勾選處，○ 為擬真空白格。
      </p>
    </div>
  );
};
