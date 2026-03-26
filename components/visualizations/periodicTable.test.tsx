import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PeriodicTableHighlights } from './PeriodicTableHighlights';

describe('PeriodicTableHighlights', () => {
  it('renders highlighted symbols', () => {
    const html = renderToStaticMarkup(
      <PeriodicTableHighlights payload={{ highlight_symbols: ['Na', 'Cl'], title: '鹽類' }} />
    );
    expect(html).toContain('Na');
    expect(html).toContain('Cl');
    expect(html).toContain('鹽類');
  });

  it('places sixth-period symbols in the extended grid', () => {
    const html = renderToStaticMarkup(
      <PeriodicTableHighlights payload={{ highlight_symbols: ['Cs'], title: '鹼金屬' }} />
    );
    expect(html).toContain('Cs');
    expect(html).not.toContain('其他：');
  });
});
