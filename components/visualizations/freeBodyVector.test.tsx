import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FreeBodyVectorDiagram } from './FreeBodyVectorDiagram';

describe('FreeBodyVectorDiagram', () => {
  it('renders canvas for vector payload', () => {
    const html = renderToStaticMarkup(
      <FreeBodyVectorDiagram vectors={[{ name: 'N', magnitude: 2, angle: 90 }]} objectShape="box" />
    );
    expect(html).toContain('<canvas');
  });
});
