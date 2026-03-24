import { describe, it, expect } from 'vitest';
import {
  canUseBrowserPlotFallback,
  samplePythonPlotGrid,
  buildPythonPlotFallbackFigure,
} from './pythonPlotBrowserFallback';

describe('pythonPlotBrowserFallback', () => {
  it('rejects unsafe expressions', () => {
    expect(canUseBrowserPlotFallback('__import__("os")')).toBe(false);
    expect(canUseBrowserPlotFallback('eval(1)')).toBe(false);
  });

  it('accepts numpy-style surface expression', () => {
    expect(canUseBrowserPlotFallback('np.sin(X) + np.cos(Y)')).toBe(true);
  });

  it('samples grid for simple Z', () => {
    const g = samplePythonPlotGrid('X + Y', 0, 1, 0, 1, 5, 5);
    expect(g).not.toBeNull();
    expect(g!.z[0]![0]).toBe(0);
    expect(g!.z[4]![4]).toBeCloseTo(2, 5);
  });

  it('builds 2d figure', () => {
    const fig = buildPythonPlotFallbackFigure('X*X + Y*Y', [-1, 1], [-1, 1], '2d');
    expect(fig).not.toBeNull();
    expect(fig!.data[0]).toMatchObject({ type: 'contour' });
  });
});
