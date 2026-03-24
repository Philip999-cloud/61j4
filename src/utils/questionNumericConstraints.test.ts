import { describe, expect, it } from 'vitest';
import { tryNumericConstraintsFromQuestionStem } from './questionNumericConstraints';
import { mergeTopologyNumericConstraints } from './topologyResolver';
import type { TopologyJSON } from './topologyResolver';

describe('tryNumericConstraintsFromQuestionStem', () => {
  it('parses shaded-then-hex pattern', () => {
    const n = tryNumericConstraintsFromQuestionStem(
      '如圖，塗色區域面積為 5，正六邊形面積為 30，求…'
    );
    expect(n?.shaded_area_math).toBe(5);
    expect(n?.figure_area_math).toBe(30);
  });

  it('parses hex-then-shaded pattern', () => {
    const n = tryNumericConstraintsFromQuestionStem(
      '正六邊形面積為12，其中塗色部分為2。'
    );
    expect(n?.figure_area_math).toBe(12);
    expect(n?.shaded_area_math).toBe(2);
  });

  it('returns undefined when ambiguous', () => {
    expect(tryNumericConstraintsFromQuestionStem('三角形面積 3 和 5')).toBeUndefined();
  });
});

describe('mergeTopologyNumericConstraints', () => {
  it('client finite values override vision', () => {
    const vision: TopologyJSON['numeric_constraints'] = {
      shaded_to_total_ratio: 0.2,
      shaded_to_total_tolerance: 0.05,
      shaded_area_math: null,
      figure_area_math: null,
    };
    const client: TopologyJSON['numeric_constraints'] = {
      shaded_to_total_ratio: 0.25,
      shaded_to_total_tolerance: null,
      shaded_area_math: null,
      figure_area_math: null,
    };
    const m = mergeTopologyNumericConstraints(vision, client);
    expect(m?.shaded_to_total_ratio).toBe(0.25);
    expect(m?.shaded_to_total_tolerance).toBe(0.05);
  });
});
