import { describe, it, expect } from 'vitest';
import { geometryJsonToSvg } from './geometryToSvg';
import type { GeometryJSON } from '../types/geometry';

/** 膠囊狀：直邊 + 兩端半圓弧（模型應在 JSON 內輸出 arcs） */
const capsuleLike: GeometryJSON = {
  shape_type: 'composite',
  canvas_width: 200,
  canvas_height: 80,
  vertices: [
    { id: 'L1', x: 40, y: 20, label: 'A' },
    { id: 'L2', x: 160, y: 20 },
    { id: 'L3', x: 160, y: 60 },
    { id: 'L4', x: 40, y: 60, label: 'B' },
  ],
  edges: [
    { from: 'L1', to: 'L2' },
    { from: 'L2', to: 'L3' },
    { from: 'L3', to: 'L4' },
    { from: 'L4', to: 'L1' },
  ],
  arcs: [
    {
      id: 'cap_left',
      cx: 40,
      cy: 40,
      r: 20,
      start_angle: Math.PI / 2,
      end_angle: -Math.PI / 2,
    },
    {
      id: 'cap_right',
      cx: 160,
      cy: 40,
      r: 20,
      start_angle: -Math.PI / 2,
      end_angle: Math.PI / 2,
    },
  ],
};

describe('geometryJsonToSvg', () => {
  it('renders capsule semicircle ends when arcs are present in JSON', () => {
    const svg = geometryJsonToSvg(capsuleLike);
    expect(svg).toContain('<path');
    // 兩條圓弧 path，各含 SVG 橢圓弧指令 " A "
    expect((svg.match(/ A /g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
