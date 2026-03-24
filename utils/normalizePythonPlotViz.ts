/**
 * 將模型回傳的 python_plot 物件正規化為 PythonFunctionPlotBlock 所需欄位。
 * 處理常見誤用：僅填 code、camelCase、範圍為字串數字等。
 */
import { canUseBrowserPlotFallback } from './pythonPlotBrowserFallback';

function coerceRange(r: unknown): [number, number] | undefined {
  if (!Array.isArray(r) || r.length !== 2) return undefined;
  const a = Number(r[0]);
  const b = Number(r[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return [a, b];
}

/** 若字串為單行安全表達式（與沙箱相同規則），可作為 func_str */
function expressionFromCode(code: string): string | undefined {
  const c = code.trim();
  if (!c || c.startsWith('<svg') || c.includes('```')) return undefined;
  if (!canUseBrowserPlotFallback(c)) return undefined;
  return c;
}

export function normalizePythonPlotViz(viz: Record<string, unknown>): {
  svgCode?: string;
  func_str?: string;
  x_range?: [number, number];
  y_range?: [number, number];
  plot_mode: '2d' | '3d';
} {
  const svgRaw =
    (typeof viz.svgCode === 'string' && viz.svgCode.trim()) ||
    (typeof viz.svg === 'string' && viz.svg.trim()) ||
    '';
  const svgCode = svgRaw || undefined;

  let func_str = typeof viz.func_str === 'string' ? viz.func_str.trim() : '';
  if (!func_str && typeof viz['funcStr'] === 'string') {
    func_str = (viz['funcStr'] as string).trim();
  }
  const code = typeof viz.code === 'string' ? viz.code.trim() : '';
  if (!func_str && code) {
    const fromCode = expressionFromCode(code);
    if (fromCode) func_str = fromCode;
  }

  let x_range = coerceRange(viz.x_range) ?? coerceRange(viz['xRange']);
  let y_range = coerceRange(viz.y_range) ?? coerceRange(viz['yRange']);

  const plot_mode =
    viz.plot_mode === '2d' || viz['plotMode'] === '2d' ? '2d' : '3d';

  return {
    svgCode,
    func_str: func_str || undefined,
    x_range,
    y_range,
    plot_mode,
  };
}
