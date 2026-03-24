import React, { useMemo } from 'react';
import type { InclinedPlaneFbdPayload } from '../../utils/aseaVizDsl';

/** 數學座標：0° 向右、90° 向上；輸出為 SVG（y 向下） */

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

function mathUnitVec(angleDeg: number): { dx: number; dy: number } {
  const r = degToRad(angleDeg);
  return { dx: Math.cos(r), dy: -Math.sin(r) };
}

function forceDirectionSvg(
  type: string,
  planeAngleDeg: number,
  frictionDir?: 'up_incline' | 'down_incline',
): { dx: number; dy: number } {
  const tUp = mathUnitVec(planeAngleDeg);
  const tDown = { dx: -tUp.dx, dy: -tUp.dy };
  if (type === 'gravity') {
    return { dx: 0, dy: 1 };
  }
  if (type === 'normal') {
    return mathUnitVec(planeAngleDeg + 90);
  }
  if (type === 'friction') {
    return frictionDir === 'down_incline' ? tDown : tUp;
  }
  return { dx: 1, dy: 0 };
}

function arrowPolygon(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
): string {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const xBack = x2 - size * Math.cos(ang);
  const yBack = y2 - size * Math.sin(ang);
  const perp = ang + Math.PI / 2;
  const w = size * 0.35;
  const p1x = xBack + w * Math.cos(perp);
  const p1y = yBack + w * Math.sin(perp);
  const p2x = xBack - w * Math.cos(perp);
  const p2y = yBack - w * Math.sin(perp);
  return `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`;
}

export interface InclinedPlaneFbdProps {
  payload: InclinedPlaneFbdPayload;
  className?: string;
}

export const InclinedPlaneFbd: React.FC<InclinedPlaneFbdProps> = ({ payload, className = '' }) => {
  const angle = Math.min(75, Math.max(5, payload.environment.angle_deg));
  const forces = payload.objects[0]?.forces ?? [];
  const arrowScale = 55;
  const blockHalf = 22;

  const { plane, blockCx, blockCy } = useMemo(() => {
    const h = 320;
    const margin = 48;
    const planeLen = 220;
    const theta = degToRad(angle);
    const x0 = margin;
    const y0 = h - margin;
    const x1 = x0 + planeLen * Math.cos(theta);
    const y1 = y0 - planeLen * Math.sin(theta);
    const cx = x0 + planeLen * 0.45 * Math.cos(theta);
    const cy = y0 - planeLen * 0.45 * Math.sin(theta);
    return { plane: { x0, y0, x1, y1 }, blockCx: cx, blockCy: cy };
  }, [angle]);

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <svg
        viewBox="0 0 400 320"
        className="max-w-full h-auto text-[var(--text-primary)]"
        role="img"
        aria-label="斜面受力分析圖"
      >
        <line
          x1="20"
          y1={plane.y0 + 4}
          x2="380"
          y2={plane.y0 + 4}
          stroke="#64748b"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <line
          x1={plane.x0}
          y1={plane.y0}
          x2={plane.x1}
          y2={plane.y1}
          stroke="#cbd5e1"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={`M ${plane.x1 - 24} ${plane.y1} A 24 24 0 0 1 ${plane.x1 - 24 * Math.cos(degToRad(angle))} ${plane.y1 - 24 * Math.sin(degToRad(angle))}`}
          stroke="#94a3b8"
          strokeWidth="1.2"
          fill="none"
        />
        <text x={plane.x1 - 6} y={plane.y1 - 10} fontSize="11" fill="#94a3b8">
          θ={angle}°
        </text>
        <g
          transform={`translate(${blockCx}, ${blockCy}) rotate(${-angle})`}
          stroke="#38bdf8"
          fill="#38bdf8"
          fillOpacity={0.12}
        >
          <rect x={-blockHalf} y={-blockHalf} width={blockHalf * 2} height={blockHalf * 2} rx="3" />
        </g>

        {forces.map((f, i) => {
          const dir = forceDirectionSvg(
            f.type,
            angle,
            f.direction as 'up_incline' | 'down_incline' | undefined,
          );
          const len = arrowScale * (f.type === 'gravity' ? 1.15 : 1);
          const x2 = blockCx + dir.dx * len;
          const y2 = blockCy + dir.dy * len;
          const color =
            f.type === 'gravity'
              ? '#ef4444'
              : f.type === 'normal'
                ? '#22c55e'
                : f.type === 'friction'
                  ? '#eab308'
                  : '#a855f7';
          return (
            <g key={`${f.label}-${i}`}>
              <line x1={blockCx} y1={blockCy} x2={x2} y2={y2} stroke={color} strokeWidth="3" />
              <polygon points={arrowPolygon(blockCx, blockCy, x2, y2, 11)} fill={color} />
              <text
                x={x2 + dir.dx * 14}
                y={y2 + dir.dy * 14 + 4}
                fontSize="12"
                fill={color}
                fontWeight="600"
              >
                {f.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
