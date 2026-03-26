import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContourMapSvg } from './ContourMapSvg';

describe('ContourMapSvg', () => {
  it('renders isoline paths', () => {
    const html = renderToStaticMarkup(
      <ContourMapSvg
        payload={{
          isolines: [
            { points: [ [0, 0], [1, 0], [1, 1] ], value: 1000 },
            { points: [ [0, 1], [2, 1] ], value: 1010 },
          ],
        }}
      />
    );
    expect(html).toContain('<path');
    expect(html).toContain('<svg');
  });
});
