import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CircuitSchematicSvg } from './CircuitSchematicSvg';

describe('CircuitSchematicSvg', () => {
  it('renders svg with series elements', () => {
    const html = renderToStaticMarkup(
      <CircuitSchematicSvg
        payload={{
          elements: [
            { kind: 'battery' },
            { kind: 'resistor', value: 'R' },
            { kind: 'ammeter' },
          ],
        }}
      />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('role="img"');
  });
});
