import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnergyLevelDiagram } from './EnergyLevelDiagram';

describe('EnergyLevelDiagram', () => {
  it('renders level lines', () => {
    const html = renderToStaticMarkup(
      <EnergyLevelDiagram
        payload={{
          levels: [
            { label: 'E3', energy: 3 },
            { label: 'E1', energy: 1 },
          ],
          sort_by_energy: true,
        }}
      />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('E3');
    expect(html).toContain('E1');
  });
});
