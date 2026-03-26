import React, { useId } from 'react';
import type { Phase2EarthCelestialPayload, Phase2MoonPhase } from '../../types';

const LABELS: Record<Phase2MoonPhase, string> = {
  new: '朔（新月）',
  waxing_crescent: '眉月（盈）',
  first_quarter: '上弦',
  waxing_gibbous: '盈凸月',
  full: '望（滿月）',
  waning_gibbous: '亏凸月',
  last_quarter: '下弦',
  waning_crescent: '眉月（亏）',
};

function MoonDisk({ phase, uid }: { phase: Phase2MoonPhase; uid: string }) {
  const clipR = `clip-r-${uid}`;
  const clipL = `clip-l-${uid}`;

  const showRight =
    phase === 'waxing_crescent' ||
    phase === 'first_quarter' ||
    phase === 'waxing_gibbous' ||
    phase === 'full';
  const showLeft =
    phase === 'waning_crescent' ||
    phase === 'last_quarter' ||
    phase === 'waning_gibbous' ||
    phase === 'full';

  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36 text-[var(--text-primary)]">
      <defs>
        <clipPath id={clipR}>
          <rect x={60} y={0} width={60} height={120} />
        </clipPath>
        <clipPath id={clipL}>
          <rect x={0} y={0} width={60} height={120} />
        </clipPath>
      </defs>
      <circle cx={60} cy={60} r={48} fill="var(--bg-card)" stroke="currentColor" strokeWidth={2} />
      {phase === 'new' ? null : (
        <>
          {showRight ? (
            <circle
              cx={60}
              cy={60}
              r={44}
              fill="rgba(250,204,21,0.45)"
              clipPath={`url(#${clipR})`}
            />
          ) : null}
          {showLeft ? (
            <circle
              cx={60}
              cy={60}
              r={44}
              fill="rgba(250,204,21,0.45)"
              clipPath={`url(#${clipL})`}
            />
          ) : null}
        </>
      )}
    </svg>
  );
}

export const CelestialGeometryDiagram: React.FC<{ payload: Phase2EarthCelestialPayload }> = ({
  payload,
}) => {
  const phase = payload.moon_phase ?? 'full';
  const uid = useId().replace(/:/g, '');
  return (
    <div className="flex flex-col items-center gap-3">
      <MoonDisk phase={phase} uid={uid} />
      <p className="text-center text-sm font-bold text-[var(--text-primary)]">{LABELS[phase]}</p>
      {payload.caption ? (
        <p className="max-w-sm text-center text-xs text-[var(--text-secondary)]">{payload.caption}</p>
      ) : null}
    </div>
  );
};
