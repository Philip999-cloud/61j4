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

/** 正十邊形外廓改以 <circle> 呈現，略過外圈折線但保留對角線 */
function decagonAsMislabeledCircle(): GeometryJSON {
  const W = 400;
  const H = 400;
  const cx = 200;
  const cy = 200;
  const R = 120;
  const n = 10;
  const labels = 'ABCDEFGHIJ'.split('');
  const vertices = labels.map((label, k) => {
    const angle = (2 * Math.PI * k) / n - Math.PI / 2;
    return {
      id: label,
      x: cx + R * Math.cos(angle),
      y: cy + R * Math.sin(angle),
      label,
    };
  });
  const boundaryEdges = labels.map((v, i) => ({
    from: v,
    to: labels[(i + 1) % n],
    style: 'solid' as const,
  }));
  const diagonal = { from: 'A', to: 'D', style: 'solid' as const };
  return {
    shape_type: 'regular_polygon',
    canvas_width: W,
    canvas_height: H,
    mid_level: {
      primary_shape: 'regular_polygon',
      polygon_sides: n,
      is_regular: true,
      has_diagonals: true,
      intersection_count: 0,
      has_coordinate_axes: true,
      has_shaded_region: false,
      shaded_region_shape: null,
    },
    vertices,
    edges: [...boundaryEdges, diagonal],
  };
}

describe('geometryJsonToSvg', () => {
  it('renders capsule semicircle ends when arcs are present in JSON', () => {
    const svg = geometryJsonToSvg(capsuleLike);
    expect(svg).toContain('<path');
    // 兩條圓弧 path，各含 SVG 橢圓弧指令 " A "
    expect((svg.match(/ A /g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('uses smooth SVG circle for high-order regular polygon (>=9) instead of faceted chords', () => {
    const svg = geometryJsonToSvg(decagonAsMislabeledCircle());
    expect(svg).toContain('<circle');
    const lineTags = svg.match(/<line\b/g) ?? [];
    expect(lineTags.length).toBe(1);
  });
});
