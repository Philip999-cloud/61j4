import React, { useId, useMemo } from 'react';
import type { Phase2EnergyLevelPayload } from '../../types';

const W = 320;
const LEFT = 100;
const RIGHT = W - 16;
const ROW_H = 44;

export const EnergyLevelDiagram: React.FC<{ payload: Phase2EnergyLevelPayload }> = ({ payload }) => {
  const mid = useId().replace(/:/g, '');
  const { rows, yForIndex } = useMemo(() => {
    const base = payload.levels.map((l, i) => ({ ...l, _i: i }));
    const sorted =
      payload.sort_by_energy !== false && base.some((l) => l.energy != null)
        ? [...base].sort((a, b) => {
            const ae = a.energy;
            const be = b.energy;
            if (ae == null && be == null) return 0;
            if (ae == null) return 1;
            if (be == null) return -1;
            return be - ae;
          })
        : base;
    const yForIndex: number[] = new Array(payload.levels.length);
    let y = 28;
    sorted.forEach((row) => {
      yForIndex[row._i] = y;
      y += ROW_H;
    });
    return { rows: sorted, yForIndex };
  }, [payload]);

  const h = 36 + payload.levels.length * ROW_H;
  const centers = payload.levels.map((_, i) => ({
    i,
    y: yForIndex[i] ?? 28,
    x: (LEFT + RIGHT) / 2,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full max-w-sm text-[var(--text-primary)]">
      {rows.map((row) => {
        const y = yForIndex[row._i] ?? 28;
        return (
          <g key={row._i}>
            <line
              x1={LEFT}
              y1={y}
              x2={RIGHT}
              y2={y}
              stroke="currentColor"
              strokeWidth={2}
              opacity={0.85}
            />
            <text x={8} y={y + 4} fill="currentColor" style={{ fontSize: 11, fontWeight: 700 }}>
              {row.label}
            </text>
            {row.energy != null ? (
              <text x={8} y={y + 18} opacity={0.55} style={{ fontSize: 9 }}>
                E={row.energy}
              </text>
            ) : null}
          </g>
        );
      })}
      {(payload.transitions ?? []).map((tr, k) => {
        const a = centers[tr.from_index];
        const b = centers[tr.to_index];
        if (!a || !b) return null;
        const y1 = a.y;
        const y2 = b.y;
        const midX = (a.x + b.x) / 2 + (k % 2 === 0 ? 28 : -28);
        const d = `M ${a.x} ${y1} Q ${midX} ${(y1 + y2) / 2} ${b.x} ${y2}`;
        return (
          <g key={k}>
            <path
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              opacity={0.45}
              markerEnd={`url(#arrowEl-${mid})`}
            />
            {tr.label ? (
              <text
                x={midX}
                y={(y1 + y2) / 2 - 6}
                textAnchor="middle"
                opacity={0.7}
                style={{ fontSize: 9 }}
              >
                {tr.label}
              </text>
            ) : null}
          </g>
        );
      })}
      <defs>
        <marker id={`arrowEl-${mid}`} markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor" opacity={0.5} />
        </marker>
      </defs>
    </svg>
  );
};
