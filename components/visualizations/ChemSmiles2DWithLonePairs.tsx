import React, { useEffect, useRef } from 'react';
import type { Phase2ChemSmiles2DPayload } from '../../types';
import SmilesDrawerMod from 'smiles-drawer';

export const ChemSmiles2DWithLonePairs: React.FC<{
  payload: Phase2ChemSmiles2DPayload;
  caption?: string;
}> = ({ payload, caption }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { smiles, lone_pair_markers, lone_pair_atom_indices } = payload;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !smiles.trim()) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const Mod = SmilesDrawerMod as Record<string, unknown>;
    const SmiDrawer = Mod.SmiDrawer as new (o: Record<string, unknown>) => {
      draw: (
        s: string,
        target: SVGElement,
        theme: string,
        onOk?: null,
        onErr?: ((e: unknown) => void) | null
      ) => void;
    };
    if (!SmiDrawer) return;

    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    try {
      const drawer = new SmiDrawer({ width: 300, height: 220, bondLength: 20, compactDrawing: false });
      drawer.draw(smiles, svg, theme, null, null);
    } catch {
      /* ignore */
    }
  }, [smiles]);

  return (
    <div className="relative flex w-full flex-col items-center gap-2">
      <div className="relative inline-block max-w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
        <svg ref={svgRef} className="block h-[220px] w-[300px] max-w-full" />
        {lone_pair_markers?.length ? (
          <div className="pointer-events-none absolute inset-3">
            {lone_pair_markers.map((m, i) => (
              <span
                key={i}
                className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-500/60 bg-sky-500/15 text-[8px] font-bold text-sky-600 dark:text-sky-300"
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                title="孤對電子標示"
              >
                {m.count === 2 ? '2e⁻' : '•'}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {lone_pair_atom_indices?.length ? (
        <p className="max-w-md text-center text-[10px] text-[var(--text-secondary)]">
          孤對電子／未共用電子對可能位置（原子索引，0-based）：{lone_pair_atom_indices.join(', ')}
        </p>
      ) : null}
      {caption ? (
        <p className="max-w-md text-center text-xs text-[var(--text-secondary)]">{caption}</p>
      ) : null}
    </div>
  );
};
