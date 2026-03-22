import React from 'react';
import LatexRenderer from '../LatexRenderer';
import { SmilesRenderer } from '../SmilesRenderer';
import { Viewer3D } from '../Viewer3D';
import { DetailedFix } from '../../types';

/**
 * 找出文本中所有 LaTeX 區塊的 [start, end) 範圍。
 * 支援 $$...$$ (display mode) 與 $...$ (inline mode)。
 * 避免匹配跳脫字符 \$ 。
 */
function findLatexBlocks(text: string): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = [];
  // 先匹配 $$...$$，再匹配 $...$（避免 \$ 被當成界定符）
  const regex = /(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<!\\)\$(?!\$)[\s\S]*?(?<!\\)\$/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    blocks.push({ start: m.index, end: m.index + m[0].length });
  }
  return blocks;
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
          <div key={pIdx} className="mb-6 last:mb-0 transition-colors duration-300 break-words">
            {segments.map((seg, i) => (
              seg.fix ? (
                <span 
                  key={i}
                  className="border-b-2 border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-colors mx-0.5 px-0.5 rounded inline-block"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPosition({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 10 });
                    setActiveFix(seg.fix || null);
                  }}
                >
                  <LatexRenderer content={seg.text} isInline={true} />
                </span>
              ) : (
                seg.text.split(/(<smiles>.*?<\/smiles>|<mol3d\s+cid=".*?"\s*\/>|<mol3d>.*?<\/mol3d>)/g).map((part, idx) => {
                  if (!part) return null;
                  if (part.startsWith('<smiles>') && part.endsWith('</smiles>')) {
                    const smiles = part.slice(8, -9);
                    return <SmilesRenderer key={`${i}-${idx}`} smiles={smiles} className="my-4" />;
                  }
                  if (part.startsWith('<mol3d') && part.endsWith('/>')) {
                    const match = part.match(/cid="([^"]+)"/);
                    const cid = match ? match[1] : '';
                    return <Viewer3D key={`${i}-${idx}`} cid={cid} />;
                  }
                  if (part.startsWith('<mol3d>') && part.endsWith('</mol3d>')) {
                    const cid = part.slice(7, -8);
                    return <Viewer3D key={`${i}-${idx}`} cid={cid} />;
                  }
                  return <LatexRenderer key={`${i}-${idx}`} content={part} isInline={true} className="inline" />;
                })
              )
            ))}
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
