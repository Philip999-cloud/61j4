import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChemSmiles2DWithLonePairs } from './ChemSmiles2DWithLonePairs';

describe('ChemSmiles2DWithLonePairs', () => {
  it('renders svg shell (drawer runs in useEffect, not SSR)', () => {
    const html = renderToStaticMarkup(
      <ChemSmiles2DWithLonePairs payload={{ smiles: 'CCO' }} />
    );
    expect(html).toContain('<svg');
  });
});
