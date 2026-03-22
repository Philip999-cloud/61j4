import React, { useState } from 'react';
import { TextAnnotation } from '../../types';

export const InteractiveChineseArticle: React.FC<{ fullText: string; annotations: TextAnnotation[] }> = ({ fullText, annotations }) => {
  const [activeAnnotation, setActiveAnnotation] = useState<TextAnnotation | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  if (!fullText) return <p className="text-[var(--text-secondary)] italic">無法顯示原始文章內容。</p>;

  const safeFullText = typeof fullText === 'string' ? fullText : String(fullText);
  const paragraphs = safeFullText.split(/\n+/);
  const safeAnnotations = Array.isArray(annotations) ? annotations : [];

  return (
    <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-xl space-y-4 max-w-full transition-colors duration-300">
      <h3 className="text-red-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2">
         <span className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">🔍</span>
         原文轉錄與點評 (INTERACTIVE DIAGNOSIS)
      </h3>

      <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2 pl-1">
         <span className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
            <span className="w-2 h-2 rounded-full border border-red-500 bg-red-500/20"></span> 
            錯誤 (點擊查看)
         </span>
         <span className="flex items-center gap-1.5 hover:text-amber-500 transition-colors">
            <span className="w-2 h-2 rounded-full border border-amber-500 bg-amber-500/20"></span> 
            建議優化
         </span>
      </div>

      <div className="relative bg-[var(--bg-main)] p-8 rounded-2xl border border-[var(--border-color)] shadow-inner max-w-full transition-colors duration-300 selection:bg-yellow-200 selection:text-black dark:selection:bg-yellow-500/40 dark:selection:text-yellow-100">
      {paragraphs.map((paragraphText, pIndex) => {
         if (!paragraphText.trim()) return null;

         let segments: { text: string; anno?: TextAnnotation }[] = [{ text: paragraphText }];

         safeAnnotations.forEach(anno => {
            if (!anno.text || anno.text.length < 2) return;
            if (!paragraphText.includes(anno.text)) return;

            const newSegments: { text: string; anno?: TextAnnotation }[] = [];
            segments.forEach(seg => {
               if (seg.anno) {
                  newSegments.push(seg);
               } else {
                  const parts = typeof seg.text === 'string' ? seg.text.split(anno.text) : [String(seg.text)];
                  parts.forEach((part, i) => {
                     if (part) newSegments.push({ text: part });
                     if (i < parts.length - 1) {
                        newSegments.push({ text: anno.text, anno: anno });
                     }
                  });
               }
            });
            segments = newSegments;
         });

         return (
            <div key={pIndex} className="mb-8 last:mb-0 font-serif text-base leading-loose text-[var(--text-primary)] tracking-wide break-words">
               {segments.map((seg, i) => {
                  if (seg.anno) {
                     const isError = seg.anno.type?.includes('錯') || seg.anno.type?.includes('誤');
                     const colorClass = isError 
                       ? "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20" 
                       : "border-amber-400/50 text-amber-600 dark:text-amber-400 bg-amber-400/10 hover:bg-amber-400/30";

                     return (
                       <span 
                         key={i}
                         className={`border-b-[3px] cursor-pointer transition-colors mx-0.5 px-1 rounded-sm relative group ${colorClass}`}
                         onClick={(e) => {
                           e.stopPropagation();
                           const rect = e.currentTarget.getBoundingClientRect();
                           setPosition({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 10 });
                           setActiveAnnotation(seg.anno || null);
                         }}
                       >
                         {seg.text}
                       </span>
                     );
                  } else {
                     return <span key={i}>{seg.text}</span>;
                  }
               })}
            </div>
         );
      })}
      </div>

      {activeAnnotation && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveAnnotation(null)}></div>
          <div 
            className="fixed z-50 w-72 bg-zinc-900 !text-white rounded-xl shadow-2xl p-4 animate-in zoom-in-95 fade-in duration-200 border border-zinc-700"
            style={{ 
              top: Math.min(window.innerHeight - 200, position.y - window.scrollY),
              left: Math.min(window.innerWidth - 300, position.x)
            }}
          >
             <div className="flex items-center gap-2 mb-2 border-b border-zinc-700 pb-2">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                   (activeAnnotation.type?.includes('錯') || activeAnnotation.type?.includes('誤'))
                   ? "bg-red-500 text-white" 
                   : "bg-amber-500 text-black"
                }`}>
                   {activeAnnotation.type || "解析"}
                </span>
             </div>
             <p className="text-sm font-medium leading-relaxed !text-zinc-200">{activeAnnotation.explanation}</p>
             <div className="absolute -top-2 left-4 w-4 h-4 bg-zinc-900 border-t border-l border-zinc-700 transform rotate-45"></div>
          </div>
        </>
      )}
    </div>
  );
};
