import { describe, expect, it } from 'vitest';
import { computePolygonArea } from './geometryMath';
import { solveRegularHexagon } from './geometrySolver';
import { topologyToSolvedGeometry } from './topologyResolver';
import type { TopologyJSON } from './topologyResolver';

function edgeLen(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('solveRegularHexagon', () => {
  it('has six equal side lengths and equal circumradius', () => {
    const g = solveRegularHexagon(480, 480, { diagonalMode: 'none' });
    const order = ['A', 'B', 'C', 'D', 'E', 'F'];
    const vmap = Object.fromEntries(g.vertices.map((v) => [v.id, v]));
    const sides: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = vmap[order[i]]!;
      const b = vmap[order[(i + 1) % 6]]!;
      sides.push(edgeLen(a, b));
    }
    const max = Math.max(...sides);
    const min = Math.min(...sides);
    expect(max - min).toBeLessThan(0.02);

    const cx = 240;
    const cy = 240;
    const rs = order.map((id) => Math.hypot(vmap[id]!.x - cx, vmap[id]!.y - cy));
    expect(Math.max(...rs) - Math.min(...rs)).toBeLessThan(0.02);
  });

  it('with all diagonals draws 6 boundary edges + 9 diagonals', () => {
    const g = solveRegularHexagon(480, 480, { diagonalMode: 'all' });
    expect(g.edges.length).toBe(15);
  });

  it('bounded_by_lines yields a triangular shaded region (3 vertex ids)', () => {
    const g = solveRegularHexagon(480, 480, {
      diagonalMode: 'all',
      shadedRegionTopology: {
        type: 'topological',
        bounded_by_lines: [
          ['A', 'D'],
          ['B', 'F'],
          ['A', 'F'],
        ],
      },
      shadedFillColor: '#fef08a',
    });
    expect(g.shaded_regions.length).toBe(1);
    expect(g.shaded_regions[0]!.vertex_ids.length).toBe(3);
  });

  it('shadedAreaConstraint ratio 1/6 picks a center wedge triangle (rim + O)', () => {
    const g = solveRegularHexagon(480, 480, {
      diagonalMode: 'all',
      shadedAreaConstraint: { mode: 'ratio', target: 1 / 6, tolerance: 0.035 },
    });
    expect(g.shaded_regions.length).toBe(1);
    const ids = new Set(g.shaded_regions[0]!.vertex_ids);
    expect(ids.size).toBe(3);
    expect(ids.has('O')).toBe(true);
    const rim = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
    expect([...ids].filter((id) => rim.has(id)).length).toBe(2);

    const vmap = Object.fromEntries(g.vertices.map((v) => [v.id, v]));
    const hexPts = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => vmap[id]!);
    const total = computePolygonArea(hexPts);
    const pts = g.shaded_regions[0]!.vertex_ids.map((id) => {
      const v = g.vertices.find((x) => x.id === id);
      if (v) return { x: v.x, y: v.y };
      const it = g.intersections.find((x) => x.id === id);
      return { x: it!.x, y: it!.y };
    });
    const sub = computePolygonArea(pts);
    expect(Math.abs(sub / total - 1 / 6)).toBeLessThan(0.035);
  });

  it('absolute shaded/figure areas match equivalent ratio constraint', () => {
    const tol = 0.04;
    const a = solveRegularHexagon(480, 480, {
      diagonalMode: 'all',
      shadedAreaConstraint: {
        mode: 'absolute',
        shadedArea: 5,
        figureArea: 30,
        tolerance: tol,
      },
    });
    const b = solveRegularHexagon(480, 480, {
      diagonalMode: 'all',
      shadedAreaConstraint: { mode: 'ratio', target: 5 / 30, tolerance: tol },
    });
    const sa = [...(a.shaded_regions[0]?.vertex_ids ?? [])].sort().join(',');
    const sb = [...(b.shaded_regions[0]?.vertex_ids ?? [])].sort().join(',');
    expect(sa).toBe(sb);
  });

  it('falls back to boundary_lines when area constraint cannot match', () => {
    const g = solveRegularHexagon(480, 480, {
      diagonalMode: 'all',
      shadedAreaConstraint: { mode: 'ratio', target: 0.99, tolerance: 0.001 },
      shadedRegionTopology: {
        type: 'topological',
        bounded_by_lines: [
          ['A', 'D'],
          ['B', 'F'],
          ['A', 'F'],
        ],
      },
    });
    expect(g.shaded_regions.length).toBe(1);
    expect(g.shaded_regions[0]!.vertex_ids.length).toBe(3);
  });
});

describe('topologyToSolvedGeometry', () => {
  it('maps hex topology with bounded_by_lines to solved geometry', () => {
    const t: TopologyJSON = {
      shape_semantics: {
        primary_shape: 'regular_hexagon',
        polygon_sides: 6,
        is_regular: true,
        question_type: 'area_geometry',
      },
      edge_topology: {
        diagonal_topology: 'all',
        specific_diagonals: null,
      },
      shaded_topology: {
        exists: true,
        method: 'bounded_by_lines',
        bounded_by_lines: [
          ['A', 'D'],
          ['B', 'F'],
          ['A', 'F'],
        ],
        positional: null,
        vertex_sequence: null,
        fill_color: '#fef08a',
      },
      ocr: { vertex_labels: ['A', 'B', 'C', 'D', 'E', 'F'], has_coordinate_axes: false },
      figure_context: { figure_in_coordinate_system: false },
    };
    const g = topologyToSolvedGeometry(t, 400, 400);
    expect(g.vertices).toHaveLength(6);
    expect(g.shaded_regions[0]?.vertex_ids.length).toBeGreaterThanOrEqual(3);
  });

  it('applies numeric_constraints.shaded_to_total_ratio for hex', () => {
    const t: TopologyJSON = {
      shape_semantics: {
        primary_shape: 'regular_hexagon',
        polygon_sides: 6,
        is_regular: true,
        question_type: 'area_geometry',
      },
      edge_topology: {
        diagonal_topology: 'all',
        specific_diagonals: null,
      },
      shaded_topology: {
        exists: true,
        method: 'none',
        bounded_by_lines: null,
        positional: null,
        vertex_sequence: null,
        fill_color: '#fef08a',
      },
      ocr: { vertex_labels: ['A', 'B', 'C', 'D', 'E', 'F'], has_coordinate_axes: false },
      figure_context: { figure_in_coordinate_system: false },
      numeric_constraints: {
        shaded_to_total_ratio: 1 / 6,
        shaded_to_total_tolerance: 0.04,
        shaded_area_math: null,
        figure_area_math: null,
      },
    };
    const g = topologyToSolvedGeometry(t, 400, 400);
    expect(g.shaded_regions.length).toBe(1);
    expect(new Set(g.shaded_regions[0]!.vertex_ids).has('O')).toBe(true);
  });
});
