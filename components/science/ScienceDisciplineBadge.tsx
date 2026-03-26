import React from 'react';

/** 自「自然科 (子學科)」等字串解析 AI 分類子學科，僅在有括號內標籤時顯示。 */
export const ScienceDisciplineBadge: React.FC<{ subjectName: string }> = ({ subjectName }) => {
  const m = subjectName.match(/自然科\s*\(([^)]+)\)/);
  const label = m ? m[1].trim() : '';
  if (!label) return null;

  return (
    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black border border-white/25 text-white/90 bg-white/10 backdrop-blur-md flex-shrink-0">
      學科：{label}
    </span>
  );
};
