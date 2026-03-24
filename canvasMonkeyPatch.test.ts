import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyCanvasPatch } from './canvasPatch';

describe('canvasMonkeyPatch', () => {
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  let restorePatch: () => void;
  let getContextCallLog: { id: string; opts?: CanvasRenderingContext2DSettings }[];

  beforeEach(() => {
    getContextCallLog = [];
    const recordingWrapper = function (
      this: HTMLCanvasElement,
      id: string,
      opts?: CanvasRenderingContext2DSettings,
    ) {
      getContextCallLog.push({ id, opts: opts ? { ...opts } : undefined });
      return null as any;
    };
    HTMLCanvasElement.prototype.getContext = recordingWrapper as typeof nativeGetContext;
    restorePatch = applyCanvasPatch();
  });

  afterEach(() => {
    restorePatch();
    HTMLCanvasElement.prototype.getContext = nativeGetContext;
  });

  it('A: 命中白名單 - canvas 在 data-asea-will-read-frequently 內，getContext("2d") 應傳入 willReadFrequently: true', () => {
    const div = document.createElement('div');
    div.setAttribute('data-asea-will-read-frequently', '');
    const canvas = document.createElement('canvas');
    div.appendChild(canvas);
    document.body.appendChild(div);

    canvas.getContext('2d');

    expect(getContextCallLog).toHaveLength(1);
    expect(getContextCallLog[0].id).toBe('2d');
    expect(getContextCallLog[0].opts).toEqual(expect.objectContaining({ willReadFrequently: true }));

    document.body.removeChild(div);
  });

  it('B: 所有 2D canvas 一律合併 willReadFrequently（含離屏／無白名單祖先）', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    const opts = { alpha: false };
    canvas.getContext('2d', opts);

    expect(getContextCallLog).toHaveLength(1);
    expect(getContextCallLog[0].id).toBe('2d');
    expect(getContextCallLog[0].opts).toEqual(
      expect.objectContaining({ alpha: false, willReadFrequently: true }),
    );

    document.body.removeChild(canvas);
  });

  it('C: 非 2D 畫布 - getContext("webgl") 邏輯不介入', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    canvas.getContext('webgl');

    expect(getContextCallLog).toHaveLength(1);
    expect(getContextCallLog[0].id).toBe('webgl');
    expect(getContextCallLog[0].opts).toBeUndefined();

    document.body.removeChild(canvas);
  });

  it('D: Plotly 容器 .js-plotly-plot 內 canvas 應傳入 willReadFrequently', () => {
    const div = document.createElement('div');
    div.className = 'js-plotly-plot';
    const canvas = document.createElement('canvas');
    div.appendChild(canvas);
    document.body.appendChild(div);

    canvas.getContext('2d');

    expect(getContextCallLog).toHaveLength(1);
    expect(getContextCallLog[0].opts).toEqual(expect.objectContaining({ willReadFrequently: true }));

    document.body.removeChild(div);
  });

  it('E: JSXGraph 容器 .jxgbox 內 canvas 應傳入 willReadFrequently', () => {
    const div = document.createElement('div');
    div.className = 'jxgbox';
    const canvas = document.createElement('canvas');
    div.appendChild(canvas);
    document.body.appendChild(div);

    canvas.getContext('2d');

    expect(getContextCallLog).toHaveLength(1);
    expect(getContextCallLog[0].opts).toEqual(expect.objectContaining({ willReadFrequently: true }));

    document.body.removeChild(div);
  });
});
