import { describe, expect, it } from 'vitest';
import {
  isAseaRenderVizItem,
  isInclinedPlaneFbdViz,
  isChem2dDslData,
  isBiologyTemplateDslData,
} from './aseaVizDsl';

describe('aseaVizDsl', () => {
  it('isAseaRenderVizItem accepts valid payload', () => {
    expect(
      isAseaRenderVizItem({
        type: 'asea_render',
        engine: 'math',
        topic: 'function_2d',
        data: { equations: ['x**2'], domain: { x_min: -2, x_max: 2 } },
      }),
    ).toBe(true);
  });

  it('isAseaRenderVizItem rejects bad engine', () => {
    expect(
      isAseaRenderVizItem({
        type: 'asea_render',
        engine: 'geo',
        topic: 'x',
        data: {},
      }),
    ).toBe(false);
  });

  it('isInclinedPlaneFbdViz', () => {
    expect(
      isInclinedPlaneFbdViz({
        type: 'free_body_diagram',
        environment: { type: 'inclined_plane', angle_deg: 30, friction: true },
        objects: [
          {
            id: 'block',
            forces: [
              { type: 'gravity', label: 'mg' },
              { type: 'normal', label: 'N' },
            ],
          },
        ],
      }),
    ).toBe(true);
    expect(
      isInclinedPlaneFbdViz({
        type: 'free_body_diagram',
        forces: [{ name: 'g', magnitude: 1, angle: 270 }],
      }),
    ).toBe(false);
  });

  it('isChem2dDslData', () => {
    expect(isChem2dDslData({ molecule_string: 'CCO' })).toBe(true);
    expect(isChem2dDslData({})).toBe(false);
  });

  it('isBiologyTemplateDslData', () => {
    expect(isBiologyTemplateDslData({ base_template: 'x.svg' })).toBe(true);
    expect(isBiologyTemplateDslData({})).toBe(false);
  });
});
