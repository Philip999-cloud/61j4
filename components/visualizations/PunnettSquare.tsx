import React, { useMemo } from 'react';
import type { Phase2PunnettPayload } from '../../types';

export const PunnettSquare: React.FC<{ payload: Phase2PunnettPayload }> = ({ payload }) => {
  const { parent1_gametes: g1, parent2_gametes: g2 } = payload;
  const grid = useMemo(() => {
    const rows: string[][] = [];
    for (let r = 0; r < g2.length; r++) {
      const row: string[] = [];
      for (let c = 0; c < g1.length; c++) {
        row.push(`${g1[c]}${g2[r]}`.replace(/\s+/g, ''));
      }
      rows.push(row);
    }
    return rows;
  }, [g1, g2]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[200px] border-collapse text-center text-sm">
        <thead>
          <tr>
            <th className="border border-[var(--border-color)] bg-[var(--bg-main)] p-2" />
            {g1.map((h, i) => (
              <th
                key={i}
                className="border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 font-mono text-[var(--text-primary)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {g2.map((side, ri) => (
            <tr key={ri}>
              <td className="border border-[var(--border-color)] bg-[var(--bg-main)] px-2 py-2 font-mono font-bold text-[var(--text-primary)]">
                {side}
              </td>
              {grid[ri]?.map((cell, ci) => (
                <td
                  key={ci}
                  className="border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-3 font-mono text-[var(--text-primary)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
