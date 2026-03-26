import React, { useMemo } from 'react';

export type AromaticRingKind = 'benzene' | 'pyridine';

export interface ChemAromaticRingDiagramProps {
  ring: AromaticRingKind;
  /** 頂點索引 0–5（自頂點順時針）；於該頂點外側標示孤對電子並套用 pulse */
  lone_pair_on_vertices?: number[];
  className?: string;
}

function vertex(i: number, R: number): { x: number; y: number } {
  const deg = -90 + i * 60;
  const rad = (deg * Math.PI) / 180;
  return { x: R * Math.cos(rad), y: R * Math.sin(rad) };
}

export const ChemAromaticRingDiagram: React.FC<ChemAromaticRingDiagramProps> = ({
  ring,
  lone_pair_on_vertices = [],
  className = '',
}) => {
  const R = 58;
  const verts = useMemo(() => [0, 1, 2, 3, 4, 5].map((i) => vertex(i, R)), []);

  const doubleEdges =
    ring === 'benzene'
      ? [
          [0, 1],
          [2, 3],
          [4, 5],
        ]
      : [
          [1, 2],
          [3, 4],
          [5, 0],
        ];

  const singleEdges: [number, number][] = [];
  for (let a = 0; a < 6; a++) {
    const b = (a + 1) % 6;
    const isDouble = doubleEdges.some(([i, j]) => (i === a && j === b) || (i === b && j === a));
    if (!isDouble) singleEdges.push([a, b]);
  }

  const loneSet = new Set(lone_pair_on_vertices.filter((i) => i >= 0 && i <= 5));

  return (
    <svg
      viewBox="-95 -95 190 190"
      className={`text-[var(--text-primary)] max-w-full h-auto ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {singleEdges.map(([a, b]) => (
          <line key={`s-${a}-${b}`} x1={verts[a].x} y1={verts[a].y} x2={verts[b].x} y2={verts[b].y} />
        ))}
        {doubleEdges.map(([a, b]) => {
          const mx = (verts[a].x + verts[b].x) / 2;
          const my = (verts[a].y + verts[b].y) / 2;
          const dx = verts[b].x - verts[a].x;
          const dy = verts[b].y - verts[a].y;
          const len = Math.hypot(dx, dy) || 1;
          const ox = (-dy / len) * 3.2;
          const oy = (dx / len) * 3.2;
          return (
            <g key={`d-${a}-${b}`}>
              <line
                x1={verts[a].x + ox}
                y1={verts[a].y + oy}
                x2={verts[b].x + ox}
                y2={verts[b].y + oy}
              />
              <line
                x1={verts[a].x - ox}
                y1={verts[a].y - oy}
                x2={verts[b].x - ox}
                y2={verts[b].y - oy}
              />
            </g>
          );
        })}
      </g>

      {verts.map((p, i) => {
        const isN = ring === 'pyridine' && i === 0;
        return (
          <text
            key={`lbl-${i}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="currentColor"
            className="text-[11px] font-black select-none"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {isN ? 'N' : 'C'}
          </text>
        );
      })}

      {verts.map((p, i) => {
        if (!loneSet.has(i)) return null;
        const len = Math.hypot(p.x, p.y) || 1;
        const ux = p.x / len;
        const uy = p.y / len;
        const cx = p.x + ux * 22;
        const cy = p.y + uy * 22;
        const perpX = -uy * 5;
        const perpY = ux * 5;
        return (
          <g key={`lp-${i}`} className="viz-lone-pair-pulse" fill="currentColor">
            <circle cx={cx - perpX} cy={cy - perpY} r={3.2} opacity={0.92} />
            <circle cx={cx + perpX} cy={cy + perpY} r={3.2} opacity={0.92} />
          </g>
        );
      })}
    </svg>
  );
};
