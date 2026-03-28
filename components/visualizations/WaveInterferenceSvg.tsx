import React, { useMemo } from 'react';

export interface WaveInterferenceSvgProps {
  /** 第二波對第一波之相位差（弧度），預設 0 為完全同相建設性疊加 */
  phaseOffsetRad?: number;
  amplitude?: number;
  label?: string;
  className?: string;
}

function buildSinePath(
  width: number,
  midY: number,
  amp: number,
  cycles: number,
  phase: number
): string {
  const steps = 160;
  const parts: string[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = t * width;
    const rad = t * cycles * Math.PI * 2 + phase;
    const y = midY + amp * Math.sin(rad);
    parts.push(s === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join(' ');
}

function buildSumPath(
  width: number,
  midY: number,
  amp: number,
  cycles: number,
  phaseOffsetRad: number
): string {
  const steps = 160;
  const a = amp * 0.5;
  const parts: string[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = t * width;
    const rad = t * cycles * Math.PI * 2;
    const y = midY + a * Math.sin(rad) + a * Math.sin(rad + phaseOffsetRad);
    parts.push(s === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join(' ');
}

export const WaveInterferenceSvg: React.FC<WaveInterferenceSvgProps> = ({
  phaseOffsetRad = 0,
  amplitude = 28,
  label,
  className = '',
}) => {
  const W = 520;
  const H = 220;
  const mid = H / 2;
  const cycles = 3;
  const A = Math.min(48, Math.max(8, amplitude));

  const p1 = useMemo(() => buildSinePath(W, mid, A * 0.5, cycles, 0), [W, mid, A, cycles]);
  const p2 = useMemo(
    () => buildSinePath(W, mid, A * 0.5, cycles, phaseOffsetRad),
    [W, mid, A, cycles, phaseOffsetRad]
  );
  const pSum = useMemo(
    () => buildSumPath(W, mid, A, cycles, phaseOffsetRad),
    [W, mid, A, cycles, phaseOffsetRad]
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`text-[var(--text-primary)] w-full max-w-full h-auto ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1={0} y1={mid} x2={W} y2={mid} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
      <path d={p1} fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.45} />
      <path d={p2} fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.45} />
      <path d={pSum} fill="none" stroke="currentColor" strokeWidth={3.2} />
      <text x={12} y={22} fill="currentColor" className="text-[11px] font-bold" style={{ fontFamily: 'system-ui' }}>
        {label || '疊加波（粗線）= 波1 + 波2'}
      </text>
    </svg>
  );
};
