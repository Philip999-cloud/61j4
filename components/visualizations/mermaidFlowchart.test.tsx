import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg class="mermaid-mock-svg"></svg>' }),
  },
}));

import { MermaidFlowchart } from './MermaidFlowchart';

describe('MermaidFlowchart', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it('injects mocked mermaid svg after effect', async () => {
    root.render(<MermaidFlowchart definition="flowchart LR\n  A-->B" />);
    await vi.waitFor(
      () => {
        expect(container.innerHTML).toContain('mermaid-mock-svg');
      },
      { timeout: 3000 }
    );
  });
});
