// src/utils/questionNumericConstraints.ts
// Ultra-conservative stem parsing for geometry extract merge (Traditional Chinese).

import type { TopologyJSON } from './topologyResolver';

/**
 * If the stem clearly states shaded area and regular-hexagon (or hexagon) whole area, return math areas.
 * Otherwise `undefined` (caller sends nothing to /api/extract-geometry).
 */
export function tryNumericConstraintsFromQuestionStem(
  text: string
): TopologyJSON['numeric_constraints'] | undefined {
  const t = text.trim();
  if (t.length < 8) return undefined;

  const shadedFirst =
    /(?:塗|涂)(?:色|滿|影)?(?:區域|部分|區)?[^0-9\uFF10-\uFF19]{0,40}?(\d+(?:\.\d+)?)[^0-9\uFF10-\uFF19]{0,160}?(?:正六邊形|正六角形|六邊形|六角形)[^0-9\uFF10-\uFF19]{0,50}?(\d+(?:\.\d+)?)/.exec(
      t
    );
  const hexFirst =
    /(?:正六邊形|正六角形|六邊形|六角形)[^0-9\uFF10-\uFF19]{0,50}?(\d+(?:\.\d+)?)[^0-9\uFF10-\uFF19]{0,160}?(?:塗|涂)(?:色|滿|影)?[^0-9\uFF10-\uFF19]{0,40}?(\d+(?:\.\d+)?)/.exec(
      t
    );

  let shaded: number;
  let figure: number;
  if (shadedFirst) {
    shaded = parseFloat(shadedFirst[1]!);
    figure = parseFloat(shadedFirst[2]!);
  } else if (hexFirst) {
    figure = parseFloat(hexFirst[1]!);
    shaded = parseFloat(hexFirst[2]!);
  } else {
    return undefined;
  }

  if (!Number.isFinite(shaded) || !Number.isFinite(figure) || shaded <= 0 || figure <= 0) {
    return undefined;
  }
  if (shaded >= figure) return undefined;

  return {
    shaded_to_total_ratio: null,
    shaded_to_total_tolerance: null,
    shaded_area_math: shaded,
    figure_area_math: figure,
  };
}
