import type { CSSProperties } from 'react';

export interface ColorOscillationCardProps {
  title?: string;
  caption?: string;
  color_from: string;
  color_to: string;
}

export function ColorOscillationCard({
  title,
  caption,
  color_from,
  color_to,
}: ColorOscillationCardProps) {
  return (
    <div
      className="mt-4 rounded-2xl border p-4 sm:p-5 overflow-hidden"
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
      <div
        className="micro-lesson-color-osc rounded-xl min-h-[5rem] w-full border transition-shadow"
        style={
          {
            '--ml-c1': color_from,
            '--ml-c2': color_to,
            borderColor: 'var(--border-color)',
          } as CSSProperties
        }
        role="img"
        aria-label={caption || '顏色振盪示意'}
      />
      {caption ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}
