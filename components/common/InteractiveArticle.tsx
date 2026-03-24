import React from 'react';
import LatexRenderer from '../LatexRenderer';
import { SmilesRenderer } from '../SmilesRenderer';
import { Viewer3D } from '../Viewer3D';
import { DetailedFix } from '../../types';

/** 區塊：$$...$$ 或 aligned／align 環境；行內：單一 $...$（非 $$） */
type ArticleMathPiece =
  | { kind: 'plain'; text: string }
  | { kind: 'block'; raw: string }
  | { kind: 'inline'; latex: string };

const BLOCK_MATH_RE =
  /\$\$[\s\S]*?\$\$|\\begin\{aligned\*?\}[\s\S]*?\\end\{aligned\*?\}|\\begin\{align\*?\}[\s\S]*?\\end\{align\*?\}/g;

function splitPlainIntoInlineAndText(plain: string): ArticleMathPiece[] {
  const pieces: ArticleMathPiece[] = [];
  const inlineRe = /(?<!\\)\$(?!\$)([\s\S]*?)(?<!\\)\$(?!\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(plain)) !== null) {
    if (m.index > last) {
      pieces.push({ kind: 'plain', text: plain.slice(last, m.index) });
    }
    pieces.push({ kind: 'inline', latex: m[1] ?? '' });
    last = m.index + m[0].length;
  }
  if (last < plain.length) {
    pieces.push({ kind: 'plain', text: plain.slice(last) });
  }
  if (pieces.length === 0 && plain) {
    pieces.push({ kind: 'plain', text: plain });
  }
  return pieces;
}

/** 將段落拆成「行內 $...$」與「區塊 $$／aligned」片段，供獨立排版 */
function splitArticleMathSegments(text: string): ArticleMathPiece[] {
  const out: ArticleMathPiece[] = [];
  const s = text;
  let last = 0;
  BLOCK_MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BLOCK_MATH_RE.exec(s)) !== null) {
    if (m.index > last) {
      out.push(...splitPlainIntoInlineAndText(s.slice(last, m.index)));
    }
    out.push({ kind: 'block', raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push(...splitPlainIntoInlineAndText(s.slice(last)));
  }
  if (out.length === 0) {
    out.push(...splitPlainIntoInlineAndText(s));
  }
  return out;
}

function blockContentForMarkdown(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('$$')) return t;
  return `$$\n${t}\n$$`;
}

/**
 * 找出文本中所有 LaTeX 區塊的 [start, end) 範圍。
 * 支援 $$...$$ (display mode) 與 $...$ (inline mode)。
 * 避免匹配跳脫字符 \$ 。
 */
function findLatexBlocks(text: string): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = [];
  const regex =
    /(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<!\\)\$(?!\$)[\s\S]*?(?<!\\)\$|\\begin\{aligned\*?\}[\s\S]*?\\end\{aligned\*?\}|\\begin\{align\*?\}[\s\S]*?\\end\{align\*?\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    blocks.push({ start: m.index, end: m.index + m[0].length });
  }
  return blocks;
}

const CHEM_SPLIT_RE = /(<smiles>.*?<\/smiles>|<mol3d\s+cid=".*?"\s*\/>|<mol3d>.*?<\/mol3d>)/g;

function renderChemistrySplitPart(part: string, keyPrefix: string): React.ReactNode {
  const parts = part.split(CHEM_SPLIT_RE);
  return (
    <>
      {parts.map((p, idx) => {
        if (!p) return null;
        if (p.startsWith('<smiles>') && p.endsWith('</smiles>')) {
          const smiles = p.slice(8, -9);
          return <SmilesRenderer key={`${keyPrefix}-${idx}`} smiles={smiles} className="my-4" />;
        }
        if (p.startsWith('<mol3d') && p.endsWith('/>')) {
          const match = p.match(/cid="([^"]+)"/);
          const cid = match ? match[1] : '';
          return <Viewer3D key={`${keyPrefix}-${idx}`} cid={cid} />;
        }
        if (p.startsWith('<mol3d>') && p.endsWith('</mol3d>')) {
          const cid = p.slice(7, -8);
          return <Viewer3D key={`${keyPrefix}-${idx}`} cid={cid} />;
        }
        return <LatexRenderer key={`${keyPrefix}-${idx}`} content={p} isInline={true} className="inline" />;
      })}
    </>
  );
}

/**
 * 安全地在文本中搜尋 searchStr，並將 LaTeX 區塊視為不可分割的原子單位 (Atomic Segment)。
 * 
 * 規則：
 * 1. 若 searchStr 完全落在某個 LaTeX 區塊之外 → 正常標記該段
 * 2. 若 searchStr 的匹配位置與某個 LaTeX 區塊重疊（部分或全部在內）→ 擴展匹配範圍至整個 LaTeX 區塊
 * 3. 永遠不會把 LaTeX 的 $ 界定符從公式中間切開
 */
function splitTextWithLatexBoundaries(text: string, searchStr: string): { part: string; isMatch: boolean }[] {
  if (!searchStr || !text.includes(searchStr)) return [{ part: text, isMatch: false }];

  const latexBlocks = findLatexBlocks(text);
  const result: { part: string; isMatch: boolean }[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const foundIndex = text.indexOf(searchStr, currentIndex);
    if (foundIndex === -1) {
      result.push({ part: text.substring(currentIndex), isMatch: false });
      break;
    }

    const matchEnd = foundIndex + searchStr.length;

    // 檢查此匹配是否與任何 LaTeX 區塊重疊
    let actualStart = foundIndex;
    let actualEnd = matchEnd;

    for (const block of latexBlocks) {
      // 重疊條件：匹配範圍 [foundIndex, matchEnd) 與區塊 [block.start, block.end) 有交集
      if (foundIndex < block.end && matchEnd > block.start) {
        // 擴展至包含整個 LaTeX 區塊
        actualStart = Math.min(actualStart, block.start);
        actualEnd = Math.max(actualEnd, block.end);
      }
    }

    // 再次檢查擴展後的範圍是否又觸及了其他 LaTeX 區塊
    for (const block of latexBlocks) {
      if (actualStart < block.end && actualEnd > block.start) {
        actualStart = Math.min(actualStart, block.start);
        actualEnd = Math.max(actualEnd, block.end);
      }
    }

    const actualContent = text.substring(actualStart, actualEnd);

    if (actualStart > currentIndex) {
      result.push({ part: text.substring(currentIndex, actualStart), isMatch: false });
    }

    result.push({ part: actualContent, isMatch: true });
    currentIndex = actualEnd;
  }

  return result;
}

export const InteractiveArticle: React.FC<{ fullText: string; fixes: DetailedFix[], className?: string }> = ({ fullText, fixes, className = '' }) => {
  const [activeFix, setActiveFix] = React.useState<DetailedFix | null>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const openFixPanel = React.useCallback((e: React.MouseEvent | React.KeyboardEvent, fix: DetailedFix) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setPosition({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 10 });
    setActiveFix(fix);
  }, []);

  const renderMathPiecesRow = React.useCallback(
    (pieces: ArticleMathPiece[], keyBase: string, fix: DetailedFix | undefined) =>
      pieces.map((p, idx) => {
        const key = `${keyBase}-${idx}`;
        if (p.kind === 'block') {
          const inner = (
            <LatexRenderer
              content={blockContentForMarkdown(p.raw)}
              isInline={false}
              className="text-[var(--text-primary)]"
            />
          );
          if (fix) {
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                className="block my-6 py-4 overflow-x-auto rounded-xl border border-red-500/40 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  openFixPanel(e, fix);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFixPanel(e, fix);
                  }
                }}
              >
                {inner}
              </div>
            );
          }
          return (
            <div key={key} className="block my-6 py-4 overflow-x-auto">
              {inner}
            </div>
          );
        }
        if (p.kind === 'inline') {
          const inner = <LatexRenderer content={`$${p.latex}$`} isInline={true} className="inline" />;
          if (fix) {
            return (
              <span
                key={key}
                className="border-b-2 border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-colors mx-0.5 px-0.5 rounded inline-block"
                onClick={(e) => {
                  e.stopPropagation();
                  openFixPanel(e, fix);
                }}
              >
                {inner}
              </span>
            );
          }
          return <React.Fragment key={key}>{inner}</React.Fragment>;
        }
        const plainNodes = renderChemistrySplitPart(p.text, `${key}-chem`);
        if (fix && p.text) {
          return (
            <span
              key={key}
              className="border-b-2 border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-colors mx-0.5 px-0.5 rounded inline-block"
              onClick={(e) => {
                e.stopPropagation();
                openFixPanel(e, fix);
              }}
            >
              {plainNodes}
            </span>
          );
        }
        return <React.Fragment key={key}>{plainNodes}</React.Fragment>;
      }),
    [openFixPanel]
  );

  if (!fullText) return <p className="text-[var(--text-secondary)] italic">無法顯示原始文章內容。</p>;

  const safeFullText = typeof fullText === 'string' ? fullText : String(fullText);
  const paragraphs = safeFullText.split(/\n+/);
  const safeFixes = Array.isArray(fixes) ? fixes : [];

  return (
    <div className={`relative font-sans transition-colors duration-300 ${className}`}>
      {paragraphs.map((paragraph, pIdx) => {
        if (!paragraph.trim()) return null;

        let segments: { text: string; fix?: DetailedFix }[] = [{ text: paragraph }];

        safeFixes.forEach(fix => {
          if (!fix.original || fix.original.length < 3) return; 
          if (!paragraph.includes(fix.original)) return;
          
          const newSegments: { text: string; fix?: DetailedFix }[] = [];
          segments.forEach(seg => {
            if (seg.fix) {
              newSegments.push(seg);
            } else {
              const segText = typeof seg.text === 'string' ? seg.text : String(seg.text);
              const splits = splitTextWithLatexBoundaries(segText, fix.original);
              splits.forEach((split) => {
                 if (split.isMatch) {
                     newSegments.push({ text: split.part, fix: fix });
                 } else {
                     if (split.part) newSegments.push({ text: split.part });
                 }
              });
            }
          });
          segments = newSegments;
        });

        return (
          <div key={pIdx} className="mb-8 last:mb-0 leading-[2.5] transition-colors duration-300 break-words">
            {segments.map((seg, i) => {
              const segText = typeof seg.text === 'string' ? seg.text : String(seg.text);
              const pieces = splitArticleMathSegments(segText);
              return (
                <React.Fragment key={i}>
                  {renderMathPiecesRow(pieces, `p${pIdx}-s${i}`, seg.fix)}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}

      {activeFix && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveFix(null)}></div>
          <div 
            className="fixed z-50 w-80 bg-zinc-900 !text-white border border-zinc-700 rounded-xl shadow-2xl p-4 animate-in zoom-in-95 fade-in duration-200"
            style={{ 
              top: Math.min(window.innerHeight - 250, position.y - window.scrollY), 
              left: Math.min(window.innerWidth - 340, position.x)
            }}
          >
             <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
                <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded">診斷</span>
             </div>
             <div className="space-y-3 text-sm">
                <div>
                  <span className="!text-zinc-500 text-xs font-bold block mb-1">【錯誤診斷】</span>
                  <p className="!text-zinc-300">{activeFix.type}</p>
                </div>
                <div>
                  <span className="!text-emerald-500 text-xs font-bold block mb-1">【修正建議】</span>
                  <p className="!text-emerald-300 font-medium">{activeFix.corrected}</p>
                </div>
                <div>
                   <span className="!text-blue-400 text-xs font-bold block mb-1">【邏輯說明】</span>
                   <p className="!text-zinc-400 text-xs leading-relaxed">{activeFix.logic}</p>
                </div>
             </div>
             <div className="absolute -top-2 left-4 w-4 h-4 bg-zinc-900 border-t border-l border-zinc-700 transform rotate-45"></div>
          </div>
        </>
      )}
    </div>
  );
};
