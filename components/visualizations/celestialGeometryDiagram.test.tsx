import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CelestialGeometryDiagram } from './CelestialGeometryDiagram';

describe('CelestialGeometryDiagram', () => {
  it('renders full moon label and svg', () => {
    const html = renderToStaticMarkup(
      <CelestialGeometryDiagram payload={{ moon_phase: 'full' }} />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('望（滿月）');
  });
});
