import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SnellLawDiagram } from './SnellLawDiagram';

describe('SnellLawDiagram', () => {
  it('renders svg for given indices and angles', () => {
    const html = renderToStaticMarkup(
      <SnellLawDiagram n1={1} n2={1.5} incidentDeg={30} refractedDeg={19} />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('<line');
  });
});
