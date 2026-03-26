import React, { useMemo } from 'react';
import type { Phase2PeriodicHighlightPayload } from '../../types';

/** 前六週期主族與常見過渡元素於 18 欄簡圖中的格位（其餘符號以清單顯示） */
const SLOT: Record<string, { r: number; c: number }> = {
  H: { r: 0, c: 0 },
  He: { r: 0, c: 17 },
  Li: { r: 1, c: 0 },
  Be: { r: 1, c: 1 },
  B: { r: 1, c: 12 },
  C: { r: 1, c: 13 },
  N: { r: 1, c: 14 },
  O: { r: 1, c: 15 },
  F: { r: 1, c: 16 },
  Ne: { r: 1, c: 17 },
  Na: { r: 2, c: 0 },
  Mg: { r: 2, c: 1 },
  Al: { r: 2, c: 12 },
  Si: { r: 2, c: 13 },
  P: { r: 2, c: 14 },
  S: { r: 2, c: 15 },
  Cl: { r: 2, c: 16 },
  Ar: { r: 2, c: 17 },
  K: { r: 3, c: 0 },
  Ca: { r: 3, c: 1 },
  Sc: { r: 3, c: 2 },
  Ti: { r: 3, c: 3 },
  V: { r: 3, c: 4 },
  Cr: { r: 3, c: 5 },
  Mn: { r: 3, c: 6 },
  Fe: { r: 3, c: 7 },
  Co: { r: 3, c: 8 },
  Ni: { r: 3, c: 9 },
  Cu: { r: 3, c: 10 },
  Zn: { r: 3, c: 11 },
  Ga: { r: 3, c: 12 },
  Ge: { r: 3, c: 13 },
  As: { r: 3, c: 14 },
  Se: { r: 3, c: 15 },
  Br: { r: 3, c: 16 },
  Kr: { r: 3, c: 17 },
  Rb: { r: 4, c: 0 },
  Sr: { r: 4, c: 1 },
  Y: { r: 4, c: 2 },
  Zr: { r: 4, c: 3 },
  Nb: { r: 4, c: 4 },
  Mo: { r: 4, c: 5 },
  Tc: { r: 4, c: 6 },
  Ru: { r: 4, c: 7 },
  Rh: { r: 4, c: 8 },
  Pd: { r: 4, c: 9 },
  Ag: { r: 4, c: 10 },
  Cd: { r: 4, c: 11 },
  In: { r: 4, c: 12 },
  Sn: { r: 4, c: 13 },
  Sb: { r: 4, c: 14 },
  Te: { r: 4, c: 15 },
  I: { r: 4, c: 16 },
  Xe: { r: 4, c: 17 },
  Cs: { r: 5, c: 0 },
  Ba: { r: 5, c: 1 },
  La: { r: 5, c: 2 },
  Hf: { r: 5, c: 3 },
  Ta: { r: 5, c: 4 },
  W: { r: 5, c: 5 },
  Re: { r: 5, c: 6 },
  Os: { r: 5, c: 7 },
  Ir: { r: 5, c: 8 },
  Pt: { r: 5, c: 9 },
  Au: { r: 5, c: 10 },
  Hg: { r: 5, c: 11 },
  Tl: { r: 5, c: 12 },
  Pb: { r: 5, c: 13 },
  Bi: { r: 5, c: 14 },
  Po: { r: 5, c: 15 },
  At: { r: 5, c: 16 },
  Rn: { r: 5, c: 17 },
};

const COLS = 18;
const ROWS = 6;
const CW = 26;
const CH = 22;

export const PeriodicTableHighlights: React.FC<{ payload: Phase2PeriodicHighlightPayload }> = ({
  payload,
}) => {
  const { placed, overflow } = useMemo(() => {
    const placed: { sym: string; r: number; c: number }[] = [];
    const overflow: string[] = [];
    for (const sym of payload.highlight_symbols) {
      const pos = SLOT[sym];
      if (pos) placed.push({ sym, r: pos.r, c: pos.c });
      else overflow.push(sym);
    }
    return { placed, overflow };
  }, [payload.highlight_symbols]);

  const w = COLS * CW + 8;
  const h = ROWS * CH + 8 + (overflow.length ? 36 : 0);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {payload.title ? (
        <p className="text-center text-xs font-bold text-[var(--text-primary)]">{payload.title}</p>
      ) : null}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-[var(--text-primary)]">
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const x = 4 + c * CW;
          const y = 4 + r * CH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={CW - 2}
              height={CH - 2}
              rx={3}
              fill="var(--bg-main)"
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={0.25}
            />
          );
        })}
        {placed.map(({ sym, r, c }) => {
          const x = 4 + c * CW;
          const y = 4 + r * CH;
          return (
            <g key={sym}>
              <rect
                x={x}
                y={y}
                width={CW - 2}
                height={CH - 2}
                rx={3}
                fill="rgba(245,158,11,0.22)"
                stroke="currentColor"
                strokeWidth={2}
                opacity={1}
              />
              <text
                x={x + (CW - 2) / 2}
                y={y + (CH - 2) / 2 + 4}
                textAnchor="middle"
                style={{ fontSize: 10, fontWeight: 700 }}
                fill="currentColor"
              >
                {sym}
              </text>
            </g>
          );
        })}
        {overflow.length > 0 ? (
          <text x={4} y={ROWS * CH + 24} style={{ fontSize: 10 }} fill="currentColor" opacity={0.75}>
            其他：{overflow.join('、')}
          </text>
        ) : null}
      </svg>
    </div>
  );
};
