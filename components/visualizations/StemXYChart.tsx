import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
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

function subscribeHtmlDarkClass(onStoreChange: () => void): () => void {
  const el = document.documentElement;
  const obs = new MutationObserver(() => onStoreChange());
  obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}

function getHtmlDarkClassSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function getHtmlDarkClassServerSnapshot(): boolean {
  return false;
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
  const containerRef = useRef<HTMLDivElement>(null);

  const isDarkClass = useSyncExternalStore(
    subscribeHtmlDarkClass,
    getHtmlDarkClassSnapshot,
    getHtmlDarkClassServerSnapshot,
  );

  const plotInputsSig = useMemo(() => {
    try {
      return JSON.stringify({
        chartKind,
        x,
        y,
        xAxisTitle: xAxisTitle ?? null,
        yAxisTitle: yAxisTitle ?? null,
        title: title ?? null,
        isDarkClass,
      });
    } catch {
      return `${chartKind}|${String(x)}|${String(y)}|${isDarkClass}`;
    }
  }, [chartKind, x, y, xAxisTitle, yAxisTitle, title, isDarkClass]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

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

    let cancelled = false;
    let resizeRo: ResizeObserver | null = null;

    const purgeEl = () => {
      try {
        if (el) Plotly.purge(el);
      } catch {
        /* ignore */
      }
    };

    if (xf.length < 1) {
      purgeEl();
      return () => {
        cancelled = true;
        purgeEl();
      };
    }

    const isDark = isDarkClass;
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

    const relayout = () => {
      try {
        if (!cancelled && el) Plotly.Plots.resize(el);
      } catch {
        /* ignore */
      }
    };

    const runNewPlot = () => {
      if (cancelled || !el) return;
      if (el.clientWidth < 2 || el.clientHeight < 2) return;
      try {
        Plotly.newPlot(el, [trace], layout, config);
        requestAnimationFrame(() => {
          if (!cancelled && el) {
            try {
              Plotly.Plots.resize(el);
            } catch {
              /* ignore */
            }
          }
        });
      } catch (e) {
        console.warn('[StemXYChart] Plotly error', e);
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        runNewPlot();
      });
    });

    resizeRo = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (cancelled || !el) return;
        if (el.clientWidth < 2 || el.clientHeight < 2) return;
        const gd = el as unknown as { data?: unknown };
        const hasPlot = gd.data != null && Array.isArray(gd.data);
        if (hasPlot) {
          relayout();
        } else {
          runNewPlot();
        }
      });
    });
    resizeRo.observe(el);
    window.addEventListener('resize', relayout);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', relayout);
      resizeRo?.disconnect();
      purgeEl();
    };
    // plotInputsSig 已涵蓋 chartKind／座標／軸標題／標題／暗色
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotInputsSig]);

  return (
    <div className="w-full space-y-1">
      <div
        ref={containerRef}
        data-asea-will-read-frequently
        className="w-full h-full min-h-[280px] sm:min-h-[320px] rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-main)] shadow-inner"
      />
    </div>
  );
};
