import React from 'react';
import { LatexRenderer } from './LatexRenderer';
import { SmilesRenderer } from './SmilesRenderer';
import { Viewer3D } from './Viewer3D';

export const TextWithChemistry: React.FC<{ content: string; className?: string; isInline?: boolean }> = ({ content, className, isInline }) => {
  if (!content) return null;
  const safeContent = typeof content === 'string' ? content : String(content);

  // 使用 [\s\S]*? 確保能跨行匹配，加上 /gi 忽略大小寫
  const parts = safeContent.split(/(<smiles>[\s\S]*?<\/smiles>|<mol3d\s+cid="[^"]*"\s*\/>|<mol3d>[\s\S]*?<\/mol3d>)/gi);

  return (
    <div className={`text-zinc-300 ${className || ''}`}>
      {parts.map((part, idx) => {
        if (!part) return null;
        const lowerPart = part.toLowerCase();

        // 1. 處理 SMILES 結構式
        if (lowerPart.startsWith('<smiles>') && lowerPart.endsWith('</smiles>')) {
          const smiles = part.substring(8, part.length - 9).trim();
          return (
            <div key={idx} className="my-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-sm">
              <SmilesRenderer smiles={smiles} />
            </div>
          );
        }

        // 2. 處理 3D 分子 (單標籤寫法) - 加入強制高度避免壓扁
        if (lowerPart.startsWith('<mol3d') && lowerPart.endsWith('/>')) {
          const match = part.match(/cid="([^"]+)"/i);
          const cid = match ? match[1] : '';
          return (
            <div key={idx} className="my-6 w-full min-h-[350px] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden relative shadow-lg">
              <Viewer3D cid={cid} />
            </div>
          );
        }

        // 3. 處理 3D 分子 (雙標籤寫法) - 加入強制高度避免壓扁
        if (lowerPart.startsWith('<mol3d>') && lowerPart.endsWith('</mol3d>')) {
          const cid = part.substring(7, part.length - 8).trim();
          return (
            <div key={idx} className="my-6 w-full min-h-[350px] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden relative shadow-lg">
              <Viewer3D cid={cid} />
            </div>
          );
        }

        // 4. 一般文字與 LaTeX (方程式) 渲染
        // 預處理：把會讓 KaTeX 崩潰的特定換行或標籤做淨化
        let cleanedLatex = part.replace(/\\n/g, ' ');
        return <LatexRenderer key={idx} content={cleanedLatex} isInline={isInline} className={className} />;
      })}
    </div>
  );
};

export default TextWithChemistry;
