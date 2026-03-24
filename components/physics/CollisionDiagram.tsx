import React, { useId } from 'react';

export interface CollisionBallParams {
  mass: string;
  v?: string;
  color: string;
  /** 像素半徑，預設依球體區分 */
  r?: number;
}

export interface CollisionParams {
  ball_A: CollisionBallParams;
  ball_B: CollisionBallParams;
  environment?: { direction?: 'positive_right' | 'positive_left' };
}

const DEFAULT_A = { cx: 100, r: 20 };
const DEFAULT_B = { cx: 250, r: 30 };
const GROUND_Y = 150;
const BALL_CY = 130;

export const CollisionDiagram: React.FC<{ params: CollisionParams }> = ({ params }) => {
  const { ball_A, ball_B } = params;
  const dir = params.environment?.direction ?? 'positive_right';
  const uid = useId().replace(/:/g, '');
  const markerId = `arrowhead-${uid}`;

  const rA = ball_A.r ?? DEFAULT_A.r;
  const rB = ball_B.r ?? DEFAULT_B.r;
  const cxA = DEFAULT_A.cx;
  const cxB = DEFAULT_B.cx;

  const arrowSign = dir === 'positive_left' ? -1 : 1;
  const tipAx = cxA + arrowSign * rA + arrowSign * 40;
  const tipBx = cxB + arrowSign * rB + arrowSign * 25;

  return (
    <svg
      viewBox="0 0 400 200"
      className="w-full max-w-full bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]"
      role="img"
      aria-label="一維碰撞示意圖"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
        </marker>
      </defs>
      <line
        x1="50"
        y1={GROUND_Y}
        x2="350"
        y2={GROUND_Y}
        stroke="var(--text-secondary)"
        strokeWidth="2"
      />
      <circle
        cx={cxA}
        cy={BALL_CY}
        r={rA}
        fill={ball_A.color}
        className="drop-shadow-md"
      />
      <text
        x={cxA}
        y={BALL_CY + 4}
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
      >
        {ball_A.mass}
      </text>
      <line
        x1={cxA + arrowSign * rA}
        y1={BALL_CY}
        x2={tipAx}
        y2={BALL_CY}
        stroke={ball_A.color}
        strokeWidth="3"
        markerEnd={`url(#${markerId})`}
        style={{ color: ball_A.color }}
      />
      {ball_A.v != null && ball_A.v !== '' && (
        <text
          x={(cxA + tipAx) / 2}
          y={BALL_CY - 10}
          textAnchor="middle"
          fill="var(--text-secondary)"
          fontSize="10"
        >
          v = {ball_A.v}
        </text>
      )}

      <circle
        cx={cxB}
        cy={BALL_CY}
        r={rB}
        fill={ball_B.color}
        className="drop-shadow-md"
      />
      <text
        x={cxB}
        y={BALL_CY + 4}
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
      >
        {ball_B.mass}
      </text>
      <line
        x1={cxB + arrowSign * rB}
        y1={BALL_CY}
        x2={tipBx}
        y2={BALL_CY}
        stroke={ball_B.color}
        strokeWidth="3"
        markerEnd={`url(#${markerId})`}
        style={{ color: ball_B.color }}
      />
      {ball_B.v != null && ball_B.v !== '' && (
        <text
          x={(cxB + tipBx) / 2}
          y={BALL_CY - 10}
          textAnchor="middle"
          fill="var(--text-secondary)"
          fontSize="10"
        >
          v = {ball_B.v}
        </text>
      )}
    </svg>
  );
};
