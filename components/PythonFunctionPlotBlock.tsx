import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import Plotly from 'plotly.js-dist';
import { SmartSvg } from './SmartSvg';
import {
  buildPythonPlotFallbackFigure,
  canUseBrowserPlotFallback,
} from '../utils/pythonPlotBrowserFallback';

export type PythonPlotMode = '3d' | '2d';

const DIRECT_SANDBOX_PLOT_URL = 'http://127.0.0.1:8765/api/python-plot';

function getPythonPlotApiUrl(): string {
  const fromEnv = import.meta.env.VITE_PYTHON_PLOT_API_URL;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim().replace(/\/$/, '');
  return '/api/python-plot';
}

function getPythonPlotRequestUrls(): string[] {
  const primary = getPythonPlotApiUrl();
  const urls = [primary];
  if (primary !== DIRECT_SANDBOX_PLOT_URL) urls.push(DIRECT_SANDBOX_PLOT_URL);
  return urls;
}

async function fetchPythonPlotSvg(
  url: string,
  body: { func_str: string; x_range: [number, number]; y_range: [number, number]; mode: PythonPlotMode },
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: unknown; svg?: string };
  if (!res.ok) {
    const detail = data.detail ?? res.statusText ?? 'Request failed';
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  const raw = data.svg;
  if (!raw || typeof raw !== 'string' || !raw.includes('<svg')) {
    throw new Error('Missing or invalid svg from plot API');
  }
  return raw.trim();
}

export interface PythonFunctionPlotBlockProps {
  title?: string;
  caption?: string;
  /** 若已有 SVG  markup 則直接顯示（向量，可縮放） */
  svgCode?: string;
  /** 若無 SVG，以前端呼叫沙箱 API 產生 */
  func_str?: string;
  x_range?: [number, number];
  y_range?: [number, number];
  mode?: PythonPlotMode;
}

const PythonPlotPlotlyFallback: React.FC<{
  func_str: string;
  x_range: [number, number];
  y_range: [number, number];
  mode: PythonPlotMode;
}> = ({ func_str, x_range, y_range, mode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !canUseBrowserPlotFallback(func_str)) return;
    const fig = buildPythonPlotFallbackFigure(func_str, x_range, y_range, mode);
    if (!fig) return;
    void Plotly.newPlot(el, fig.data as never, fig.layout as never, {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    }).catch((e) => console.error('[PythonFunctionPlotBlock] Plotly fallback:', e));
    return () => {
      Plotly.purge(el);
    };
  }, [func_str, x_range[0], x_range[1], y_range[0], y_range[1], mode]);

  return (
    <div className="w-full px-2 py-2">
      <p className="text-[10px] text-[var(--text-secondary)] mb-2">
        瀏覽器後備繪圖（Matplotlib 沙箱未回應時，以 Plotly 顯示相同數值網格）
      </p>
      <div ref={ref} className="w-full min-h-[300px]" />
    </div>
  );
};

export const PythonFunctionPlotBlock: React.FC<PythonFunctionPlotBlockProps> = ({
  title,
  caption,
  svgCode: initialSvg,
  func_str,
  x_range,
  y_range,
  mode = '3d',
}) => {
  const [svg, setSvg] = useState<string | null>(initialSvg?.trim() || null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [browserFallback, setBrowserFallback] = useState(false);

  useEffect(() => {
    if (initialSvg && initialSvg.trim()) {
      setSvg(initialSvg.trim());
      setErr(null);
      setBrowserFallback(false);
      return;
    }
    if (!func_str?.trim() || !x_range || !y_range || x_range.length !== 2 || y_range.length !== 2) {
      setSvg(null);
      setErr(null);
      setBrowserFallback(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErr(null);
    setSvg(null);
    setBrowserFallback(false);

    const body = {
      func_str: func_str.trim(),
      x_range: [Number(x_range[0]), Number(x_range[1])] as [number, number],
      y_range: [Number(y_range[0]), Number(y_range[1])] as [number, number],
      mode,
    };
    const urls = getPythonPlotRequestUrls();

    void (async () => {
      let lastErr: Error | null = null;
      try {
        for (const url of urls) {
          try {
            const raw = await fetchPythonPlotSvg(url, body);
            if (!cancelled) {
              setSvg(raw);
              setErr(null);
              setBrowserFallback(false);
            }
            return;
          } catch (e) {
            lastErr = e instanceof Error ? e : new Error(String(e));
          }
        }

        if (!cancelled) {
          const okFb = canUseBrowserPlotFallback(func_str.trim());
          if (okFb) {
            setBrowserFallback(true);
            setErr(null);
          } else {
            setBrowserFallback(false);
            setErr(lastErr?.message ?? '繪圖失敗');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialSvg, func_str, x_range, y_range, mode]);

  const canRenderFallback =
    browserFallback &&
    func_str?.trim() &&
    x_range &&
    y_range &&
    x_range.length === 2 &&
    y_range.length === 2;

  return (
    <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden">
      <div className="mb-3 flex justify-between items-center px-1">
        <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {title || 'Python 函數圖（向量 SVG）'}
        </h5>
      </div>
      <div className="rounded-xl overflow-hidden border border-[var(--border-color)]/60 bg-[var(--bg-main)] min-h-[200px] flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-2 py-12 text-[var(--text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin opacity-60" />
            <span className="text-xs">Matplotlib 沙箱繪圖中…</span>
          </div>
        )}
        {!loading && err && (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center text-amber-600 dark:text-amber-400 text-sm">
            <ImageIcon className="w-8 h-8 opacity-50" />
            <span>{err}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">
              請確認已啟動 python_plot_sandbox（見專案目錄說明）或已設定 VITE_PYTHON_PLOT_API_URL；符合安全字元之算式會自動改以瀏覽器 Plotly 顯示。
            </span>
          </div>
        )}
        {!loading && !err && svg && (
          <div className="w-full max-h-[480px] overflow-auto py-2">
            <SmartSvg svgCode={svg} className="svg-content w-full flex-1 min-h-[200px] max-w-full" />
          </div>
        )}
        {!loading && !err && canRenderFallback && (
          <PythonPlotPlotlyFallback
            func_str={func_str!.trim()}
            x_range={[Number(x_range![0]), Number(x_range![1])]}
            y_range={[Number(y_range![0]), Number(y_range![1])]}
            mode={mode}
          />
        )}
        {!loading && !err && !svg && !canRenderFallback && (
          <div className="flex flex-col items-center gap-2 py-10 text-[var(--text-secondary)] text-sm">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span>缺少 svgCode 或 func_str／範圍參數</span>
          </div>
        )}
      </div>
      {caption && (
        <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
          <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{caption}</p>
        </div>
      )}
    </div>
  );
};
