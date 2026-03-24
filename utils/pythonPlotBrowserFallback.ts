/**
 * 當 Matplotlib 沙箱不可用時，以與 python_plot_sandbox 相同的 func_str 語意（Z = expr，變數 X、Y、np）
 * 在瀏覽器內採樣網格，產生 Plotly figure。僅允許字元與子字串檢查與後端 _validate_func_str 對齊。
 */

export type PythonPlotBrowserMode = '2d' | '3d';

const FUNC_STR_MAX_LEN = 512;

const BANNED_SUBSTRINGS = [
  '__',
  'import',
  'exec',
  'eval',
  'open',
  'file',
  'input',
  'os.',
  'sys.',
  'subprocess',
  'compile',
  'globals',
  'locals',
  'getattr',
  'setattr',
  'delattr',
  'breakpoint',
  'memoryview',
  'bytearray',
] as const;

/** 與 python_plot_sandbox/app.py 的 _SAFE_FUNC_PATTERN 對齊 */
const SAFE_FUNC_PATTERN = /^[\s0-9XYnp+\-*/^.,()\[\]:eE_a-zA-Z]+$/;

function makeNp(): Record<string, unknown> {
  const sinh =
    Math.sinh ?? ((x: number) => (Math.exp(x) - Math.exp(-x)) / 2);
  const cosh =
    Math.cosh ?? ((x: number) => (Math.exp(x) + Math.exp(-x)) / 2);
  const tanh = Math.tanh ?? ((x: number) => sinh(x) / cosh(x));
  return {
    pi: Math.PI,
    e: Math.E,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    arcsin: Math.asin,
    arccos: Math.acos,
    arctan: Math.atan,
    arctan2: Math.atan2,
    sinh,
    cosh,
    tanh,
    exp: Math.exp,
    log: Math.log,
    log10: Math.log10,
    sqrt: Math.sqrt,
    abs: Math.abs,
    maximum: Math.max,
    minimum: Math.min,
    sign: Math.sign,
    power: Math.pow,
  };
}

export function canUseBrowserPlotFallback(funcStr: string): boolean {
  const s = (funcStr || '').trim();
  if (!s || s.length > FUNC_STR_MAX_LEN) return false;
  const low = s.toLowerCase();
  for (const bad of BANNED_SUBSTRINGS) {
    if (low.includes(bad)) return false;
  }
  return SAFE_FUNC_PATTERN.test(s);
}

function linspace(a: number, b: number, n: number): number[] {
  if (n < 2) return [a];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(a + ((b - a) * i) / (n - 1));
  }
  return out;
}

export function samplePythonPlotGrid(
  funcStr: string,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  nx: number,
  ny: number,
): { z: number[][]; x: number[]; y: number[] } | null {
  if (!canUseBrowserPlotFallback(funcStr)) return null;
  const xs = linspace(x0, x1, nx);
  const ys = linspace(y0, y1, ny);
  const np = makeNp();
  let fn: (npObj: Record<string, unknown>, X: number, Y: number) => unknown;
  try {
    fn = new Function('np', 'X', 'Y', `"use strict"; return (${funcStr});`) as typeof fn;
  } catch {
    return null;
  }
  const z: number[][] = [];
  for (let i = 0; i < ny; i++) {
    const row: number[] = [];
    const Yv = ys[i]!;
    for (let j = 0; j < nx; j++) {
      const Xv = xs[j]!;
      try {
        const v = Number(fn(np, Xv, Yv));
        row.push(Number.isFinite(v) ? v : NaN);
      } catch {
        row.push(NaN);
      }
    }
    z.push(row);
  }
  return { z, x: xs, y: ys };
}

export function buildPythonPlotFallbackFigure(
  funcStr: string,
  x_range: [number, number],
  y_range: [number, number],
  mode: PythonPlotBrowserMode,
): { data: object[]; layout: object } | null {
  const sampled = samplePythonPlotGrid(
    funcStr,
    x_range[0],
    x_range[1],
    y_range[0],
    y_range[1],
    72,
    72,
  );
  if (!sampled) return null;

  const { z, x, y } = sampled;
  if (mode === '2d') {
    return {
      data: [
        {
          type: 'contour',
          z,
          x,
          y,
          colorscale: 'Magma',
          connectgaps: false,
        },
      ],
      layout: {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(250,250,250,0.9)',
        margin: { t: 28, r: 24, b: 40, l: 48 },
        xaxis: { title: 'X', zeroline: false },
        yaxis: { title: 'Y', zeroline: false },
        autosize: true,
      },
    };
  }

  return {
    data: [
      {
        type: 'surface',
        z,
        x,
        y,
        colorscale: 'Magma',
      },
    ],
    layout: {
      paper_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 28, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' },
        zaxis: { title: 'Z' },
      },
      autosize: true,
    },
  };
}
