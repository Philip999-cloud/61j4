export interface CoordinationMultiplyLessonProps {
  title?: string;
  caption?: string;
  bidentate_count: number;
  teeth_per_ligand: number;
  result_coordination: number;
}

function ToothBlock({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block w-2 h-3 rounded-sm border"
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: active ? 'var(--text-secondary)' : 'transparent',
        opacity: active ? 0.85 : 0.35,
      }}
      aria-hidden
    />
  );
}

export function CoordinationMultiplyLesson({
  title,
  caption,
  bidentate_count,
  teeth_per_ligand,
  result_coordination,
}: CoordinationMultiplyLessonProps) {
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
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm sm:text-base">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            雙牙基數
          </span>
          <div className="flex gap-1.5 flex-wrap justify-center max-w-[12rem]">
            {Array.from({ length: bidentate_count }, (_, li) => (
              <div
                key={li}
                className="flex gap-0.5 p-1 rounded-lg border"
                style={{ borderColor: 'var(--border-color)' }}
                title={`配體 ${li + 1}`}
              >
                <ToothBlock active />
                <ToothBlock active />
              </div>
            ))}
          </div>
        </div>
        <span className="text-2xl font-light tabular-nums" style={{ color: 'var(--text-secondary)' }}>
          ×
        </span>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            每基齒數
          </span>
          <div className="flex gap-0.5 items-center">
            {Array.from({ length: teeth_per_ligand }, (_, ti) => (
              <ToothBlock key={ti} active />
            ))}
          </div>
          <span className="text-xs tabular-nums font-mono">{teeth_per_ligand}</span>
        </div>
        <span className="text-2xl font-light" style={{ color: 'var(--text-secondary)' }}>
          =
        </span>
        <div
          className="flex flex-col items-center justify-center min-w-[3.5rem] min-h-[3.5rem] rounded-xl border px-3 py-2"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}
        >
          <span className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            配位數
          </span>
          <span className="text-2xl font-black tabular-nums">{result_coordination}</span>
        </div>
      </div>
      {caption ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}
