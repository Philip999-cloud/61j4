import React, { useMemo } from 'react';
import type { Phase2EarthContourPayload } from '../../types';

const VB = 200;

export const ContourMapSvg: React.FC<{ payload: Phase2EarthContourPayload }> = ({ payload }) => {
  const { paths, vb } = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const iso of payload.isolines) {
      for (const [x, y] of iso.points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (!Number.isFinite(minX)) {
      return { paths: [] as string[], vb: `0 0 ${VB} ${VB}` };
    }
    const pad = 8;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const sx = (VB - 2 * pad) / w;
    const sy = (VB - 2 * pad) / h;
    const paths: string[] = [];
    for (const iso of payload.isolines) {
      if (iso.points.length < 2) continue;
      const d = iso.points
        .map(([x, y], i) => {
          const px = pad + (x - minX) * sx;
          const py = VB - pad - (y - minY) * sy;
          return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
        })
        .join(' ');
      paths.push(d);
    }
    return { paths, vb: `0 0 ${VB} ${VB}` };
  }, [payload]);

  if (paths.length === 0) return null;

  return (
    <svg viewBox={vb} className="w-full max-w-md text-sky-600 dark:text-sky-300">
      <rect width={VB} height={VB} fill="var(--bg-main)" rx={8} />
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          opacity={0.65 + (i % 3) * 0.1}
        />
      ))}
    </svg>
  );
};
