import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PunnettSquare } from './PunnettSquare';

describe('PunnettSquare', () => {
  it('renders table with combined gametes', () => {
    const html = renderToStaticMarkup(
      <PunnettSquare
        payload={{ parent1_gametes: ['A', 'a'], parent2_gametes: ['B', 'b'] }}
      />
    );
    expect(html).toContain('<table');
    expect(html).toContain('AB');
    expect(html).toContain('ab');
  });
});
