import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';

export type StemXYChartKind = 'line' | 'scatter';

export interface StemXYChartProps {
  chartKind: StemXYChartKind;
  x: number[];
  y: number[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  title?: string;
  caption?: string;
}

function coerceNums(a: unknown[]): number[] {
  return a.map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  });
}

export const StemXYChart: React.FC<StemXYChartProps> = ({
  chartKind,
  x,
  y,
  xAxisTitle,
  yAxisTitle,
  title,
  caption: _caption,
}) => {
  const chartId = useRef(`stemxy-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    const xs = coerceNums(x);
    const ys = coerceNums(y);
    const n = Math.min(xs.length, ys.length, 512);
    const xf: number[] = [];
    const yf: number[] = [];
    for (let i = 0; i < n; i++) {
      if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) {
        xf.push(xs[i]);
        yf.push(ys[i]);
      }
    }
    if (xf.length < 1) return;

    const isDark = document.documentElement.classList.contains('dark');
    const axisColor = isDark ? '#d4d4d8' : '#27272a';
    const gridColor = isDark ? '#3f3f46' : '#e4e4e7';
    const plotBg = isDark ? '#18181b' : '#fafafa';

    const trace =
      chartKind === 'scatter'
        ? {
            type: 'scatter' as const,
            mode: 'markers' as const,
            x: xf,
            y: yf,
            marker: { size: 9, color: '#1565C0' },
          }
        : {
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: xf,
            y: yf,
            line: { width: 3, color: '#1565C0', shape: 'linear' as const },
          };

    const layout = {
      title: title ? { text: title, font: { color: axisColor, size: 14 } } : undefined,
      paper_bgcolor: 'transparent',
      plot_bgcolor: plotBg,
      margin: { l: 56, r: 24, t: title ? 48 : 28, b: 52 },
      xaxis: {
        title: xAxisTitle || '',
        color: axisColor,
        gridcolor: gridColor,
        zerolinecolor: gridColor,
      },
      yaxis: {
        title: yAxisTitle || '',
        color: axisColor,
        gridcolor: gridColor,
        zerolinecolor: gridColor,
      },
      autosize: true,
    };

    const config = { responsive: true, displayModeBar: false };

    try {
      Plotly.newPlot(chartId.current, [trace], layout, config);
    } catch (e) {
      console.warn('[StemXYChart] Plotly error', e);
    }

    const el = document.getElementById(chartId.current);
    const relayout = () => {
      try {
        if (el) Plotly.Plots.resize(el);
      } catch {
        /* ignore */
      }
    };
    const ro = el && new ResizeObserver(() => requestAnimationFrame(relayout));
    if (el && ro) ro.observe(el);
    window.addEventListener('resize', relayout);

    return () => {
      window.removeEventListener('resize', relayout);
      ro?.disconnect();
      try {
        Plotly.purge(chartId.current);
      } catch {
        /* ignore */
      }
    };
  }, [chartKind, x, y, xAxisTitle, yAxisTitle, title]);

  return (
    <div className="w-full space-y-1">
      <div
        id={chartId.current}
        data-asea-will-read-frequently
        className="w-full h-full min-h-[280px] sm:min-h-[320px] rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-main)] shadow-inner"
      />
    </div>
  );
};
