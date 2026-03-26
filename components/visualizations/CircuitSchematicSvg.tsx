import React from 'react';
import type { Phase2CircuitSchematicPayload } from '../../types';

function Battery({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={-18} x2={0} y2={-6} stroke="currentColor" strokeWidth={2} />
      <line x1={-8} y1={-6} x2={8} y2={-6} stroke="currentColor" strokeWidth={2} />
      <line x1={-4} y1={0} x2={4} y2={0} stroke="currentColor" strokeWidth={3} />
      <line x1={0} y1={0} x2={0} y2={18} stroke="currentColor" strokeWidth={2} />
    </g>
  );
}

function Resistor({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        d="M 0,-20 L 0,-12 L 8,-8 L -8,0 L 8,8 L -8,16 L 0,20 L 0,28"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      {label ? (
        <text x={14} y={4} fill="currentColor" opacity={0.75} style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace' }}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Ammeter({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={22} fill="none" stroke="currentColor" strokeWidth={2} />
      <text textAnchor="middle" dy={5} fill="currentColor" style={{ fontSize: 11, fontWeight: 800 }}>
        A
      </text>
    </g>
  );
}

export const CircuitSchematicSvg: React.FC<{
  payload: Phase2CircuitSchematicPayload;
  className?: string;
}> = ({ payload, className = '' }) => {
  const { elements } = payload;
  const seg = 72;
  const w = Math.max(320, elements.length * seg + 80);
  const h = 100;
  const cy = 50;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`w-full max-w-full text-[var(--text-primary)] ${className}`}
      role="img"
      aria-label="電路示意圖"
    >
      <line x1={16} y1={cy} x2={w - 16} y2={cy} stroke="currentColor" strokeWidth={2} opacity={0.35} />
      {elements.map((el, i) => {
        const cx = 40 + i * seg;
        if (el.kind === 'battery') return <Battery key={i} x={cx} y={cy} />;
        if (el.kind === 'ammeter') return <Ammeter key={i} x={cx} y={cy} />;
        return (
          <Resistor
            key={i}
            x={cx}
            y={cy}
            label={el.value ?? el.label}
          />
        );
      })}
    </svg>
  );
};
