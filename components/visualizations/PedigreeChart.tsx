import React, { useMemo } from 'react';
import type { Phase2PedigreePayload } from '../../types';

const W = 420;
const H = 220;

export const PedigreeChart: React.FC<{ payload: Phase2PedigreePayload }> = ({ payload }) => {
  const layout = useMemo(() => {
    const ids = payload.nodes.map((n) => n.id);
    const index = new Map(ids.map((id, i) => [id, i]));
    const x: number[] = ids.map((_, i) => 60 + (i % 4) * 100);
    const y: number[] = ids.map((_, i) => 40 + Math.floor(i / 4) * 70);
    const edges = payload.edges
      .map((e) => {
        const a = index.get(e.from);
        const b = index.get(e.to);
        if (a == null || b == null) return null;
        return { x1: x[a]!, y1: y[a]!, x2: x[b]!, y2: y[b]! };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[];
    return { x, y, edges };
  }, [payload]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full text-[var(--text-primary)]">
      {layout.edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="currentColor"
          strokeWidth={1.5}
          opacity={0.45}
        />
      ))}
      {payload.nodes.map((n, i) => {
        const cx = layout.x[i] ?? 0;
        const cy = layout.y[i] ?? 0;
        const male = n.gender === 'male';
        const aff = n.affected;
        if (male) {
          return (
            <g key={n.id} transform={`translate(${cx - 16},${cy - 16})`}>
              <rect
                width={32}
                height={32}
                fill={aff ? 'rgba(239,68,68,0.25)' : 'transparent'}
                stroke="currentColor"
                strokeWidth={2}
              />
              <title>{n.id}</title>
            </g>
          );
        }
        return (
          <g key={n.id} transform={`translate(${cx},${cy})`}>
            <circle
              r={16}
              fill={aff ? 'rgba(239,68,68,0.25)' : 'transparent'}
              stroke="currentColor"
              strokeWidth={2}
            />
            <title>{n.id}</title>
          </g>
        );
      })}
      {payload.nodes.map((n, i) => (
        <text
          key={`${n.id}-lbl`}
          x={layout.x[i]}
          y={(layout.y[i] ?? 0) + 36}
          textAnchor="middle"
          fill="currentColor"
          opacity={0.65}
          style={{ fontSize: 9 }}
        >
          {n.id}
        </text>
      ))}
    </svg>
  );
};
