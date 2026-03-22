/**
 * Canvas getContext 白名單 patch：僅對 Ketcher 等需頻繁讀取的套件加上 willReadFrequently，
 * 避免 GPU Canvas（3D、動畫）被降級為 CPU 軟體渲染。
 */
export function isWillReadFrequentlyCanvas(canvas: HTMLCanvasElement): boolean {
  return !!(
    canvas.closest('[data-asea-will-read-frequently]') ||
    canvas.closest('[data-ketcher-editor]') ||
    canvas.closest('[data-ketcher-fullscreen-container]')
  );
}

export function applyCanvasPatch(): () => void {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    id: string,
    opts?: CanvasRenderingContext2DSettings,
  ) {
    if (id === '2d' && isWillReadFrequentlyCanvas(this)) {
      opts = Object.assign({ willReadFrequently: true }, opts || {});
    }
    return origGetContext.call(this, id, opts);
  } as typeof origGetContext;

  return () => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  };
}
