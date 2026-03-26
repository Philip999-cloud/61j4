import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PedigreeChart } from './PedigreeChart';

describe('PedigreeChart', () => {
  it('renders svg with edges as lines', () => {
    const html = renderToStaticMarkup(
      <PedigreeChart
        payload={{
          nodes: [
            { id: 'a', gender: 'male' },
            { id: 'b', gender: 'female' },
          ],
          edges: [{ from: 'a', to: 'b' }],
        }}
      />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('<line');
  });
});
