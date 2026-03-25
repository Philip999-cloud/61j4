import React, { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/contrib/mhchem';
import 'katex/dist/katex.min.css';

/** AI 產生 SVG：Campbell 級解剖／機制圖 — 保留 defs、漸層、遮罩、marker、filter */
const PHYSICS_SVG_SANITIZE: DOMPurify.Config = {
  USE_PROFILES: { svg: true, svgFilters: true, mathMl: true },
  ADD_TAGS: [
    'foreignObject',
    'math',
    'semantics',
    'mrow',
    'mi',
    'mo',
    'mn',
    'msup',
    'mspace',
    'annotation',
    'defs',
    'linearGradient',
    'radialGradient',
    'stop',
    'clipPath',
    'mask',
    'marker',
    'pattern',
    'filter',
    'feGaussianBlur',
    'feColorMatrix',
    'feOffset',
    'feMerge',
    'feMergeNode',
    'feFlood',
    'feComposite',
    'feBlend',
    'feDropShadow',
    'feMorphology',
    'feComponentTransfer',
    'feFuncA',
    'feFuncR',
    'feFuncG',
    'feFuncB',
    'symbol',
    'use',
    'image',
    'title',
    'desc',
  ],
  ADD_ATTR: [
    'xmlns',
    'xmlns:xlink',
    'gradientUnits',
    'gradientTransform',
    'spreadMethod',
    'fx',
    'fy',
    'cx',
    'cy',
    'r',
    'x1',
    'y1',
    'x2',
    'y2',
    'offset',
    'stop-color',
    'stop-opacity',
    'clip-path',
    'mask',
    'marker-start',
    'marker-mid',
    'marker-end',
    'markerUnits',
    'markerWidth',
    'markerHeight',
    'refX',
    'refY',
    'orient',
    'preserveAspectRatio',
    'patternUnits',
    'patternContentUnits',
    'patternTransform',
    'filter',
    'flood-color',
    'flood-opacity',
    'stdDeviation',
    'in',
    'in2',
    'result',
    'mode',
    'operator',
    'k1',
    'k2',
    'k3',
    'k4',
    'xlink:href',
  ],
};

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** 從 AI 回傳字串中取出第一個完整 `<svg>...</svg>`，略過 Markdown 围栏與雜訊（根標籤大小寫不拘） */
export function extractFirstSvgFragment(raw: string): string {
  if (typeof raw !== 'string') return '';
  const m = raw.match(/<svg\b[\s\S]*?<\/svg>/i);
  return (m ? m[0] : raw).trim();
}

/**
 * 若根 `<svg>` 開頭標籤缺少預設命名空間，則插入 `xmlns`，利於 `image/svg+xml` 解析與 namespaceURI 檢查。
 */
export function ensureSvgRootXmlns(svg: string): string {
  const t = svg.trim();
  const m = t.match(/^<svg\b[^>]*>/is);
  if (!m) return svg;
  const openTag = m[0];
  if (/\sxmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(openTag)) {
    return t;
  }
  const injected = openTag.replace(/^<svg\b/i, `<svg xmlns="${SVG_NAMESPACE}"`);
  return t.slice(0, m.index!) + injected + t.slice(m.index! + openTag.length);
}

/** 與 SmartSvg / AseaRenderBlock 共用：已消毒的 SVG 字串是否可被 DOMParser 當作 SVG XML 解析 */
export function isParsableAiSvgMarkup(markup: string): boolean {
  const t = markup?.trim();
  if (!t || !/<svg\b/i.test(t)) return false;
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return true;
  try {
    const doc = new DOMParser().parseFromString(t, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return false;
    const root = doc.documentElement;
    return (
      root != null &&
      root.namespaceURI === SVG_NAMESPACE &&
      root.localName.toLowerCase() === 'svg'
    );
  } catch {
    return false;
  }
}

/** 供 VisualizationRenderer / SmartSvg 等先洗 XSS，再交 PhysicsRenderer（可重複呼叫，結果仍安全） */
export function sanitizeAiSvgCode(raw: string): string {
  const extracted = extractFirstSvgFragment(raw);
  const withNs = ensureSvgRootXmlns(extracted);
  return DOMPurify.sanitize(withNs, PHYSICS_SVG_SANITIZE);
}

const cleanLatexForSvg = (text: string) => {
  if (!text) return '';
  return text.replace(/\\n/g, ' ');
};

/** 僅在含 $、LaTeX 指令或矩陣環境時才以 foreignObject + KaTeX 替換，其餘保留原生 <text> 以利縮放 */
function textNeedsLatexRendering(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.includes('$')) return true;
  if (t.includes('\\begin')) return true;
  if (/\\[a-zA-Z]+/.test(t)) return true;
  return false;
}

function renderLatexToHtml(text: string): string {
  if (typeof text !== 'string') return '';
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
  let html = '';
  parts.forEach((part) => {
    if (part.startsWith('$$') || part.startsWith('\\[')) {
      const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2);
      try {
        html += katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch {
        html += part;
      }
    } else if (part.startsWith('$') || part.startsWith('\\(')) {
      const math = part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2);
      try {
        html += katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch {
        html += part;
      }
    } else if (part) {
      html += `<span class="physics-svg-plain font-sans font-medium text-xs whitespace-nowrap">${part}</span>`;
    }
  });
  return html;
}

function normalizeSvgResponsive(svg: SVGSVGElement) {
  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', '0 0 400 300');
  }
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.maxWidth = '100%';
  svg.style.display = 'block';
  svg.style.overflow = 'visible';
  svg.setAttribute('class', `${svg.getAttribute('class') || ''} physics-renderer-svg smart-svg-canvas`.trim());
}

/**
 * 生物／教材插圖：保留原始 fill／stroke（動脈紅、靜脈藍等），不改成 currentColor。
 */
function ensureDiagramLabelReadability(svg: SVGSVGElement, labelFilterId: string) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }
  let filter = defs.querySelector(`#${CSS.escape(labelFilterId)}`) as SVGFilterElement | null;
  if (!filter) {
    filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', labelFilterId);
    filter.setAttribute('x', '-40%');
    filter.setAttribute('y', '-40%');
    filter.setAttribute('width', '180%');
    filter.setAttribute('height', '180%');
    const feDrop = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDrop.setAttribute('dx', '0');
    feDrop.setAttribute('dy', '1');
    feDrop.setAttribute('stdDeviation', isDark ? '1.2' : '1');
    feDrop.setAttribute('flood-color', isDark ? '#000000' : '#ffffff');
    feDrop.setAttribute('flood-opacity', isDark ? '0.85' : '0.9');
    filter.appendChild(feDrop);
    defs.appendChild(filter);
  }

  svg.querySelectorAll('text').forEach((textEl) => {
    if (textEl.closest('foreignObject')) return;
    if (!textEl.getAttribute('filter')) {
      textEl.setAttribute('filter', `url(#${labelFilterId})`);
    }
  });
}

function styleForeignObjectLabelRoots(svg: SVGSVGElement) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const shadow = isDark ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)';
  const capsuleBg = isDark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.78)';

  svg.querySelectorAll('foreignObject div').forEach((node) => {
    const el = node as HTMLElement;
    const innermost = (el.querySelector('div') || el) as HTMLElement;
    if (innermost.classList.contains('smart-svg-fo-styled')) return;
    innermost.classList.add('smart-svg-fo-styled');
    const prev = innermost.style.cssText;
    innermost.style.cssText = `${prev};text-shadow:${shadow};border-radius:6px;padding:2px 8px;background:${capsuleBg};box-decoration-break:clone;-webkit-box-decoration-break:clone;`.trim();
  });
}

export interface PhysicsRendererProps {
  svgCode: string;
  className?: string;
  /** false = 將部分 hex stroke 改為 currentColor（舊物理圖主題）；true = 保留教材圖原始色彩（預設） */
  preserveDiagramColors?: boolean;
}

/**
 * 物理／STEM SVG：解析後掃描 <text>，若內容含 $...$ 等數學標記則以 foreignObject 嵌入 KaTeX；
 * 響應式以 viewBox 為主，並透過 currentColor 配合主題。
 */
export const PhysicsRenderer: React.FC<PhysicsRendererProps> = ({
  svgCode,
  className = '',
  preserveDiagramColors = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelFilterIdRef = useRef(`smart-svg-text-halo-${Math.random().toString(36).slice(2, 10)}`);
  const safeSvgCode = useMemo(() => sanitizeAiSvgCode(svgCode), [svgCode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement | null;
    if (!svgElement) return;

    normalizeSvgResponsive(svgElement);

    if (!preserveDiagramColors) {
      const strokeCandidates = svgElement.querySelectorAll('[stroke]:not([stroke="none"])');
      strokeCandidates.forEach((el) => {
        const s = el.getAttribute('stroke');
        if (s && /^#[0-9a-fA-F]{3,8}$/.test(s)) {
          el.setAttribute('stroke', 'currentColor');
        }
      });
    }

    let defsEl = svgElement.querySelector('defs');
    if (!defsEl) {
      defsEl = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgElement.insertBefore(defsEl, svgElement.firstChild);
    }
    if (!defsEl.querySelector('marker#arrow')) {
      ['arrow', 'arrow-red', 'arrow-blue'].forEach((mid) => {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', mid);
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        path.setAttribute('fill', 'currentColor');
        marker.appendChild(path);
        defsEl!.appendChild(marker);
      });
    }

    const replaceTextWithForeignObject = (
      textNode: SVGTextElement | SVGTSpanElement,
      htmlContent: string,
      _inheritFill?: string,
      inheritFontSize?: string
    ) => {
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const textAnchor = textNode.getAttribute('text-anchor') || 'start';
      const fontSizeRaw = textNode.getAttribute('font-size') || inheritFontSize || '12';
      const fontSizePx = parseFloat(String(fontSizeRaw)) || 12;

      fo.setAttribute('x', textNode.getAttribute('x') ?? '0');
      fo.setAttribute('y', textNode.getAttribute('y') ?? '0');
      fo.setAttribute('width', '1');
      fo.setAttribute('height', '1');
      fo.setAttribute('overflow', 'visible');
      fo.style.overflow = 'visible';
      fo.style.pointerEvents = 'none';

      const outer = document.createElement('div');
      outer.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      outer.style.cssText =
        'position:relative;overflow:visible;pointer-events:none;box-sizing:border-box';

      const inner = document.createElement('div');
      inner.innerHTML = htmlContent;
      inner.style.color = 'var(--text-primary, currentColor)';
      inner.style.fontSize = `${fontSizePx}px`;
      inner.style.whiteSpace = 'nowrap';
      inner.style.width = 'max-content';
      const isDarkFo = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      inner.style.textShadow = isDarkFo
        ? '0 1px 2px rgba(0,0,0,0.8)'
        : '0 1px 2px rgba(255,255,255,0.8)';
      inner.style.borderRadius = '6px';
      inner.style.padding = '2px 8px';
      inner.style.background = isDarkFo ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.78)';
      inner.style.boxDecorationBreak = 'clone';
      (inner.style as unknown as { webkitBoxDecorationBreak?: string }).webkitBoxDecorationBreak = 'clone';
      inner.classList.add('smart-svg-fo-styled');

      if (textAnchor === 'middle') {
        inner.style.transform = 'translate(-50%, -50%)';
        inner.style.textAlign = 'center';
      } else if (textAnchor === 'end') {
        inner.style.transform = 'translate(-100%, -50%)';
        inner.style.textAlign = 'right';
      } else {
        inner.style.transform = 'translate(0, -50%)';
        inner.style.textAlign = 'left';
      }

      outer.appendChild(inner);
      fo.appendChild(outer);
      textNode.parentNode?.replaceChild(fo, textNode);
    };

    const processTextNode = (
      node: SVGTextElement | SVGTSpanElement,
      inheritFill?: string,
      inheritFontSize?: string
    ) => {
      let originalText = node.textContent || '';
      originalText = cleanLatexForSvg(originalText);

      if (!textNeedsLatexRendering(originalText)) {
        if (!preserveDiagramColors) {
          if (!node.getAttribute('fill') || /^#[0-9a-fA-F]{3,8}$/.test(node.getAttribute('fill') || '')) {
            node.setAttribute('fill', 'currentColor');
          }
        }
        return;
      }

      if (originalText.includes('\\') && !originalText.includes('$')) {
        if (originalText.includes('begin')) originalText = `$$${originalText}$$`;
        else originalText = `$${originalText}$`;
      }
      const htmlContent = renderLatexToHtml(originalText);
      replaceTextWithForeignObject(node as SVGTextElement, htmlContent, inheritFill, inheritFontSize);
    };

    const textNodes = svgElement.querySelectorAll('text');
    textNodes.forEach((textNode) => {
      const tspans = Array.from(textNode.querySelectorAll('tspan'));

      if (tspans.length > 0) {
        const parentFill = textNode.getAttribute('fill') || undefined;
        const parentFontSize = textNode.getAttribute('font-size') || undefined;
        tspans.forEach((tspan) => {
          processTextNode(tspan as unknown as SVGTextElement, parentFill, parentFontSize);
        });
        const remaining = textNode.textContent?.trim();
        if (!remaining && textNode.parentNode) {
          textNode.parentNode.removeChild(textNode);
        }
      } else {
        processTextNode(textNode);
      }
    });

    ensureDiagramLabelReadability(svgElement, labelFilterIdRef.current);
    styleForeignObjectLabelRoots(svgElement);
  }, [svgCode, safeSvgCode, preserveDiagramColors]);

  return (
    <div
      ref={containerRef}
      className={`physics-renderer-root smart-svg-root isolate w-full max-w-full h-full min-h-[inherit] overflow-x-auto [&_svg]:max-w-none ${preserveDiagramColors ? '' : 'text-[var(--text-primary)]'} ${className}`}
      dangerouslySetInnerHTML={{ __html: safeSvgCode }}
    />
  );
};

export default PhysicsRenderer;
