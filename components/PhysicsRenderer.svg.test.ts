import { describe, expect, it } from 'vitest';
import {
  ensureSvgRootXmlns,
  extractFirstSvgFragment,
  isParsableAiSvgMarkup,
  sanitizeAiSvgCode,
} from './PhysicsRenderer';

describe('extractFirstSvgFragment', () => {
  it('captures fragment when root tag is uppercase SVG', () => {
    const raw = 'prefix <SVG viewBox="0 0 10 10"><circle cx="5" cy="5" r="2"/></SVG> tail';
    expect(extractFirstSvgFragment(raw)).toContain('<circle');
    expect(extractFirstSvgFragment(raw)).toMatch(/^<SVG/i);
  });

  it('uses non-greedy match to first closing svg', () => {
    const s = '<svg><g></g></svg>';
    expect(extractFirstSvgFragment(s)).toBe(s);
  });
});

describe('ensureSvgRootXmlns', () => {
  it('injects xmlns when missing on root', () => {
    const s = '<svg viewBox="0 0 10 10"></svg>';
    const out = ensureSvgRootXmlns(s);
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toMatch(/^<svg\s/);
  });

  it('does not duplicate xmlns', () => {
    const s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>';
    expect(ensureSvgRootXmlns(s)).toBe(s.trim());
  });
});

describe('sanitizeAiSvgCode + isParsableAiSvgMarkup', () => {
  it('accepts uppercase root SVG without xmlns after sanitize', () => {
    const raw =
      '<SVG viewBox="0 0 100 100"><rect x="0" y="0" width="50" height="50" fill="#3b82f6"/></SVG>';
    const clean = sanitizeAiSvgCode(raw);
    expect(clean.length).toBeGreaterThan(0);
    expect(isParsableAiSvgMarkup(clean)).toBe(true);
  });
});
