import React from 'react';

export interface SnellLawDiagramProps {
  n1?: number;
  n2?: number;
  /** 入射角（度），自法線量起 */
  incidentDeg?: number;
  /** 若提供則直接使用，略過斯涅爾計算 */
  refractedDeg?: number;
  className?: string;
}

export const SnellLawDiagram: React.FC<SnellLawDiagramProps> = ({
  n1 = 1,
  n2 = 1.33,
  incidentDeg = 40,
  refractedDeg: refractedDegProp,
  className = '',
}) => {
  const th1 = (Math.min(89, Math.max(0, incidentDeg)) * Math.PI) / 180;
  let th2: number;
  if (refractedDegProp != null && Number.isFinite(refractedDegProp)) {
    th2 = (Math.min(89, Math.max(0, refractedDegProp)) * Math.PI) / 180;
  } else {
    const ratio = (n1 / n2) * Math.sin(th1);
    th2 = Math.abs(ratio) > 1 ? Math.PI / 2 - 0.02 : Math.asin(ratio);
  }

  const cx = 180;
  const cy = 140;
  const L = 95;
  const markerId = React.useId().replace(/:/g, 'sn');

  const x1 = cx - L * Math.sin(th1);
  const y1 = cy - L * Math.cos(th1);
  const x2 = cx + L * Math.sin(th2);
  const y2 = cy + L * Math.cos(th2);

  return (
    <svg
      viewBox="0 0 360 280"
      className={`text-[var(--text-primary)] w-full max-w-full h-auto ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
        </marker>
      </defs>

      <text x={12} y={24} fill="currentColor" className="text-[10px] font-bold" style={{ fontFamily: 'system-ui' }}>
        n₁ = {n1.toFixed(2)}（上） / n₂ = {n2.toFixed(2)}（下）
      </text>

      <line x1={40} y1={cy} x2={320} y2={cy} stroke="currentColor" strokeWidth={2.5} />
      <line
        x1={cx}
        y1={40}
        x2={cx}
        y2={240}
        stroke="currentColor"
        strokeWidth={1.2}
        strokeDasharray="5 5"
        strokeOpacity={0.55}
      />

      <line
        x1={x1}
        y1={y1}
        x2={cx}
        y2={cy}
        stroke="currentColor"
        strokeWidth={2.5}
        markerEnd={`url(#${markerId})`}
      />
      <line
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeOpacity={0.9}
        markerEnd={`url(#${markerId})`}
      />

      <path
        d={`M ${cx - 28} ${cy - 2} A 28 28 0 0 1 ${cx - 28 * Math.sin(th1)} ${cy - 28 * Math.cos(th1)}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeOpacity={0.5}
      />
      <path
        d={`M ${cx + 28} ${cy + 2} A 28 28 0 0 0 ${cx + 28 * Math.sin(th2)} ${cy + 28 * Math.cos(th2)}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeOpacity={0.5}
      />

      <text
        x={cx - 52}
        y={cy - 38}
        fill="currentColor"
        className="text-[9px] font-bold"
        style={{ fontFamily: 'system-ui' }}
      >
        θ₁
      </text>
      <text
        x={cx + 18}
        y={cy + 52}
        fill="currentColor"
        className="text-[9px] font-bold"
        style={{ fontFamily: 'system-ui' }}
      >
        θ₂
      </text>
    </svg>
  );
};
