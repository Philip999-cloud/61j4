import { describe, expect, it } from 'vitest';
import {
  validateVisualizationItem,
  filterRenderableVisualizations,
} from './validateStemVisualization';

describe('validateStemVisualization', () => {
  it('accepts titration_curve with x/y', () => {
    expect(
      validateVisualizationItem({
        type: 'titration_curve',
        x: [0, 1, 2],
        y: [3, 4, 5],
      }).valid
    ).toBe(true);
  });

  it('accepts stem_xy_chart scatter with a single point', () => {
    expect(
      validateVisualizationItem({
        type: 'stem_xy_chart',
        chart_kind: 'scatter',
        x: [1.5],
        y: [2],
      }).valid
    ).toBe(true);
  });

  it('accepts stem_xy_chart line with chart_kind case variants', () => {
    expect(
      validateVisualizationItem({
        type: 'stem_xy_chart',
        chart_kind: 'Line',
        x: [0, 1],
        y: [0, 2],
      }).valid
    ).toBe(true);
  });

  it('rejects stem_xy_chart line with only one point', () => {
    expect(
      validateVisualizationItem({
        type: 'stem_xy_chart',
        chart_kind: 'line',
        x: [0],
        y: [0],
      }).valid
    ).toBe(false);
  });

  it('rejects titration_curve with short arrays', () => {
    expect(
      validateVisualizationItem({
        type: 'titration_curve',
        x: [1],
        y: [2],
      }).valid
    ).toBe(false);
  });

  it('accepts circuit_schematic', () => {
    expect(
      validateVisualizationItem({
        type: 'circuit_schematic',
        elements: [{ kind: 'battery' }, { kind: 'resistor' }],
      }).valid
    ).toBe(true);
  });

  it('filters list', () => {
    const out = filterRenderableVisualizations([
      { type: 'titration_curve', x: [0, 1], y: [2, 3] },
      { type: 'titration_curve', x: [0], y: [1] },
      null,
    ] as unknown[]);
    expect(out).toHaveLength(1);
  });

  it('accepts energy_level_diagram', () => {
    expect(
      validateVisualizationItem({
        type: 'energy_level_diagram',
        levels: [{ label: 'E2' }, { label: 'E0' }],
      }).valid
    ).toBe(true);
  });

  it('accepts periodic_table_highlight', () => {
    expect(
      validateVisualizationItem({
        type: 'periodic_table_highlight',
        highlight_symbols: ['Fe', 'Cu'],
      }).valid
    ).toBe(true);
  });
});
