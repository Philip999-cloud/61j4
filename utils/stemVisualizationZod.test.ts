import { describe, expect, it } from 'vitest';
import {
  safeParseVisualizationItem,
  type SafeParseVisualizationResult,
} from './stemVisualizationZod';

type ZodVizFailure = Extract<SafeParseVisualizationResult, { ok: false }>;

describe('stemVisualizationZod', () => {
  it('accepts titration_curve with coercible numeric arrays', () => {
    const item = {
      type: 'titration_curve',
      x: [0, 1, 2],
      y: ['0', '5', '10'],
    };
    const r = safeParseVisualizationItem(item);
    expect(r.ok).toBe(true);
  });

  it('rejects titration_curve missing y (strict branch)', () => {
    const item = { type: 'titration_curve', x: [0, 1] };
    const r = safeParseVisualizationItem(item);
    expect(r.ok).toBe(false);
    const fail = r as ZodVizFailure;
    expect(fail.error.issues.length).toBeGreaterThan(0);
  });

  it('rejects unknown visualization type', () => {
    const item = { type: 'not_a_real_viz', foo: 1 };
    const r = safeParseVisualizationItem(item);
    expect(r.ok).toBe(false);
  });
});
