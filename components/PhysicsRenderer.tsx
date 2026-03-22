import React, { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/contrib/mhchem';
import 'katex/dist/katex.min.css';

/** AI 產生 SVG：允許 KaTeX／MathML 與 foreignObject，避免誤刪數學標籤 */
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
  ],
  ADD_ATTR: ['xmlns'],
};

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
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', '0 0 400 300');
  }
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.width = '100%';
  svg.style.height = 'auto';
  svg.style.maxWidth = '100%';
  svg.style.overflow = 'visible';
  svg.setAttribute('class', `${svg.getAttribute('class') || ''} physics-renderer-svg`.trim());
}

/** 將常見硬編碼描邊改為 currentColor，便於 Dark/Light 與主題變數 */
function applyThemeAwareStrokes(svg: SVGSVGElement) {
  const strokeCandidates = svg.querySelectorAll('[stroke]:not([stroke="none"])');
  strokeCandidates.forEach((el) => {
    const s = el.getAttribute('stroke');
    if (s && /^#[0-9a-fA-F]{3,8}$/.test(s)) {
      el.setAttribute('stroke', 'currentColor');
    }
  });
}

export interface PhysicsRendererProps {
  svgCode: string;
  className?: string;
}

/**
 * 物理／STEM SVG：解析後掃描 <text>，若內容含 $...$ 等數學標記則以 foreignObject 嵌入 KaTeX；
 * 響應式以 viewBox 為主，並透過 currentColor 配合主題。
 */
export const PhysicsRenderer: React.FC<PhysicsRendererProps> = ({ svgCode, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const safeSvgCode = useMemo(
    () => DOMPurify.sanitize(svgCode, PHYSICS_SVG_SANITIZE),
    [svgCode]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement | null;
    if (!svgElement) return;

    normalizeSvgResponsive(svgElement);
    applyThemeAwareStrokes(svgElement);

    if (!svgElement.querySelector('defs')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
        <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
      `;
      svgElement.prepend(defs);
    }

    const replaceTextWithForeignObject = (
      textNode: SVGTextElement | SVGTSpanElement,
      htmlContent: string,
      _inheritFill?: string,
      inheritFontSize?: string
    ) => {
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const x = parseFloat(textNode.getAttribute('x') || '0');
      const y = parseFloat(textNode.getAttribute('y') || '0');
      const textAnchor = textNode.getAttribute('text-anchor') || 'start';
      const fontSizeRaw = textNode.getAttribute('font-size') || inheritFontSize || '12';
      const fontSizePx = parseFloat(String(fontSizeRaw)) || 12;

      const foWidth = Math.max(200, 240);
      const foHeight = Math.max(100, 120);

      let finalX = x;
      if (textAnchor === 'middle') finalX = x - foWidth / 2;
      else if (textAnchor === 'end') finalX = x - foWidth;

      const baselineLift = Math.max(14, fontSizePx * 0.85);
      const finalY = y - baselineLift;

      fo.setAttribute('x', String(finalX));
      fo.setAttribute('y', String(finalY));
      fo.setAttribute('width', String(foWidth));
      fo.setAttribute('height', String(foHeight));
      fo.setAttribute('overflow', 'visible');
      fo.style.overflow = 'visible';
      fo.style.pointerEvents = 'none';

      const outer = document.createElement('div');
      outer.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      outer.style.cssText =
        'position:relative;width:100%;height:100%;overflow:visible;pointer-events:none;box-sizing:border-box';

      const inner = document.createElement('div');
      inner.innerHTML = htmlContent;
      inner.style.color = 'var(--text-primary, currentColor)';
      inner.style.fontSize = `${fontSizePx}px`;
      inner.style.whiteSpace = 'nowrap';
      inner.style.position = 'absolute';
      inner.style.left = `${x - finalX}px`;
      inner.style.top = `${y - finalY}px`;

      if (textAnchor === 'middle') {
        inner.style.transform = 'translateX(-50%)';
        inner.style.textAlign = 'center';
      } else if (textAnchor === 'end') {
        inner.style.transform = 'translateX(-100%)';
        inner.style.textAlign = 'right';
      } else {
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
        if (!node.getAttribute('fill') || /^#[0-9a-fA-F]{3,8}$/.test(node.getAttribute('fill') || '')) {
          node.setAttribute('fill', 'currentColor');
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
  }, [svgCode, safeSvgCode]);

  return (
    <div
      ref={containerRef}
      className={`physics-renderer-root w-full max-w-full overflow-x-auto text-[var(--text-primary)] ${className}`}
      dangerouslySetInnerHTML={{ __html: safeSvgCode }}
    />
  );
};

export default PhysicsRenderer;
