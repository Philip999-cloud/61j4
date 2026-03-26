import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('./StemXYChart', () => ({
  StemXYChart: () => <div id="stemxy-fixture-test" />,
}));

import { TitrationCurveChart } from './TitrationCurveChart';

describe('TitrationCurveChart', () => {
  it('delegates to StemXYChart plot container id prefix', () => {
    const html = renderToStaticMarkup(
      <TitrationCurveChart x={[0, 1, 2]} y={[7, 8, 9]} title="測試滴定" />
    );
    expect(html).toMatch(/stemxy-/);
  });
});
