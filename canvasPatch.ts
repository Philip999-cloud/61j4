/**
 * Canvas getContext patch：對所有 2D 內容加上 willReadFrequently。
 * Plotly／Ketcher／RDKit(Cairo WASM) 會在初始化或離屏階段建立 canvas，此時尚不在
 * [data-asea-will-read-frequently] 等白名單祖先下；僅對「已掛上樹」畫布套白名單仍會觸發
 * Chrome「Multiple readback operations… willReadFrequently」警告。
 */
type GetContextFn = typeof HTMLCanvasElement.prototype.getContext;

export function applyCanvasPatch(): () => void {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    id: string,
    opts?: CanvasRenderingContext2DSettings,
  ) {
    if (id === '2d') {
      opts = Object.assign({ willReadFrequently: true }, opts || {});
    }
    return origGetContext.call(this, id, opts);
  } as unknown as GetContextFn;

  let restoreOffscreen: (() => void) | undefined;
  const OC = typeof globalThis !== 'undefined' ? (globalThis as { OffscreenCanvas?: typeof OffscreenCanvas }).OffscreenCanvas : undefined;
  if (OC?.prototype?.getContext) {
    const origOc = OC.prototype.getContext as typeof OC.prototype.getContext;
    OC.prototype.getContext = function (this: OffscreenCanvas, id: string, opts?: CanvasRenderingContext2DSettings) {
      if (id === '2d') {
        opts = Object.assign({ willReadFrequently: true }, opts || {});
      }
      return (origOc as (this: OffscreenCanvas, contextId: string, options?: unknown) => unknown).call(
        this,
        id,
        opts,
      );
    } as typeof OC.prototype.getContext;
    restoreOffscreen = () => {
      OC.prototype.getContext = origOc;
    };
  }

  return () => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
    restoreOffscreen?.();
  };
}
