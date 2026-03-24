// src/utils/solvedToGeometryJson.ts
// SolvedGeometry -> GeometryJSON for geometryJsonToSvg

import type { GeometryJSON, GeometryShapeType } from '../types/geometry';
import type { SolvedGeometry } from './geometrySolver';

export function solvedToGeometryJson(solved: SolvedGeometry): GeometryJSON {
  const n = solved.vertices.length;
  const edgeCount = solved.edges.length;
  const hasDiagonals = edgeCount > n;
  const interCount = solved.intersections.length;
  const hasShaded = solved.shaded_regions.length > 0;

  const vertexOcr = solved.vertices
    .filter((v) => v.label)
    .map((v) => ({ label: v.label!, near_vertex_id: v.id }));

  const shape_type: GeometryShapeType = 'regular_polygon';

  return {
    low_level: {
      bounding_box: { x: 0, y: 0, w: solved.canvas_width, h: solved.canvas_height },
      has_text_labels: vertexOcr.length > 0,
      estimated_line_count: edgeCount,
    },
    mid_level: {
      primary_shape: shape_type,
      polygon_sides: n,
      is_regular: true,
      has_diagonals,
      intersection_count: interCount,
      has_coordinate_axes: false,
      has_shaded_region: hasShaded,
      shaded_region_shape: hasShaded ? 'polygon' : null,
    },
    high_level: {
      question_type: 'area_geometry',
      math_constraints: [],
      shaded_region_description: '',
      given_conditions: [],
      figure_in_coordinate_system: false,
    },
    ocr: {
      vertex_labels: vertexOcr,
      numeric_labels: [],
      text_blocks: [],
    },
    shape_type,
    canvas_width: solved.canvas_width,
    canvas_height: solved.canvas_height,
    vertices: solved.vertices.map((v) => ({
      id: v.id,
      x: v.x,
      y: v.y,
      label: v.label,
      confidence: 'high' as const,
    })),
    edges: solved.edges.map((e) => ({
      from: e.from,
      to: e.to,
      style: e.style ?? 'solid',
    })),
    circles: [],
    intersections: solved.intersections,
    shaded_regions: solved.shaded_regions,
    axis: null,
    math_constraints: [],
  };
}
