import { useId } from 'react';
import type { MicroLessonArrow, MicroLessonStep } from '../../types';

export interface OxidationTimelineLessonProps {
  title?: string;
  caption?: string;
  steps: MicroLessonStep[];
  arrows?: MicroLessonArrow[];
}

export function OxidationTimelineLesson({
  title,
  caption,
  steps,
  arrows,
}: OxidationTimelineLessonProps) {
  const markerId = useId().replace(/:/g, '');
  const n = steps.length;
  const xPct = (i: number) => ((i + 0.5) / n) * 100;

  return (
    <div
      className="mt-4 rounded-2xl border p-4 sm:p-5"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
    >
      {title ? (
        <h5 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </h5>
      ) : null}
      <div className="relative min-h-[7rem]">
        {arrows && arrows.length > 0 ? (
          <svg
            className="absolute left-0 right-0 top-8 h-16 w-full overflow-visible pointer-events-none opacity-80"
            viewBox="0 0 100 24"
            preserveAspectRatio="none"
            aria-hidden
          >
            {arrows.map((a, idx) => {
              const x1 = xPct(a.from_index);
              const x2 = xPct(a.to_index);
              const y = 12;
              const mid = (x1 + x2) / 2;
              const arc = Math.abs(x2 - x1) < 0.01 ? 0 : (x2 > x1 ? 1 : -1);
              const d =
                arc === 0
                  ? `M ${x1} ${y} L ${x2} ${y}`
                  : `M ${x1} ${y} Q ${mid} ${y - 8 * arc} ${x2} ${y}`;
              return (
                <g key={idx}>
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth={0.35}
                    markerEnd={`url(#${markerId})`}
                  />
                </g>
              );
            })}
            <defs>
              <marker
                id={markerId}
                markerWidth="4"
                markerHeight="4"
                refX="3.5"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 4 2, 0 4" fill="var(--text-secondary)" />
              </marker>
            </defs>
          </svg>
        ) : null}
        <div className="relative z-[1] flex flex-wrap items-stretch justify-between gap-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex-1 min-w-[4.5rem] rounded-xl border px-2 py-3 text-center"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}
            >
              <div className="text-[10px] font-semibold leading-tight mb-1" style={{ color: 'var(--text-secondary)' }}>
                {s.label}
              </div>
              {s.species ? (
                <div className="text-xs font-mono mb-1 truncate" title={s.species}>
                  {s.species}
                </div>
              ) : null}
              <div className="text-lg font-black tabular-nums">
                {s.oxidation_state > 0 ? `+${s.oxidation_state}` : s.oxidation_state}
              </div>
            </div>
          ))}
        </div>
        {arrows && arrows.some((a) => a.label) ? (
          <ul className="mt-2 text-[11px] space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
            {arrows
              .filter((a) => a.label)
              .map((a, idx) => (
                <li key={idx}>
                  {a.from_index + 1} → {a.to_index + 1}: {a.label}
                </li>
              ))}
          </ul>
        ) : null}
      </div>
      {caption ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}
