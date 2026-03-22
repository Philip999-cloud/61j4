import React from 'react';
import { PolishedSentence, ParagraphDiagnosis, MasterpieceAlignment } from '../../types';

export const PolishedSentenceCard: React.FC<{ item: PolishedSentence }> = ({ item }) => (
  <div className="bg-[var(--bg-main)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm group hover:border-indigo-500/30 transition-colors duration-300">
     <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-full border border-indigo-500/20 uppercase tracking-widest">{item.type}</span>
     </div>
     <div className="space-y-3">
        <div className="text-[var(--text-secondary)] text-sm line-through decoration-[var(--border-color)] decoration-2 decoration-wavy break-words">{item.original}</div>
        <div className="text-indigo-600 dark:text-indigo-300 font-serif text-base leading-relaxed border-l-2 border-indigo-500 pl-3 break-words">{item.refined}</div>
        <p className="text-[var(--text-secondary)] text-xs mt-2 break-words">{item.logic}</p>
     </div>
  </div>
);

export const ParagraphCard: React.FC<{ item: ParagraphDiagnosis }> = ({ item }) => (
  <div className="bg-[var(--bg-main)] p-5 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors duration-300">
     <div className="flex items-center gap-3 mb-3">
        <span className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] font-black text-xs shadow-sm">{item.paragraph_id?.substring(0,2) || "#"}</span>
        <h5 className="text-[var(--text-primary)] font-bold text-sm">{item.main_idea}</h5>
     </div>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10">
           <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">診斷</span>
           <p className="text-[var(--text-secondary)] text-xs leading-relaxed break-words">{item.critique}</p>
        </div>
        <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">建議</span>
           <p className="text-emerald-600 dark:text-emerald-400/80 text-xs leading-relaxed break-words">{item.suggestion}</p>
        </div>
     </div>
  </div>
);

export const MasterpieceCard: React.FC<{ data: MasterpieceAlignment }> = ({ data }) => (
  <div className="bg-[var(--bg-card)] text-[var(--text-primary)] rounded-[1.25rem] p-8 border border-[var(--border-color)] relative overflow-hidden shadow-xl max-w-full transition-colors duration-300">
     <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

     <h4 className="text-xs font-medium text-[var(--text-secondary)] tracking-widest mb-4">名家對應佳句</h4>
     
     <h3 className="font-serif text-3xl font-black text-amber-500 dark:text-amber-400 mb-4 tracking-tight">
        {data.publication}
     </h3>
     
     <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed font-light opacity-90 break-words">
        {data.analysis}
     </p>
     
     <div className="relative pl-6 py-2">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-full"></div>
        <p className="italic font-serif text-lg text-[var(--text-primary)] leading-relaxed tracking-wide break-words">
           「{data.quote}」
        </p>
     </div>
  </div>
);

export const StructureCard: React.FC<{ title: string; content: string; className?: string }> = ({ title, content, className }) => {
  if (!content) return null;
  return (
    <div className={`p-5 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] hover:border-purple-500/30 transition-colors duration-300 ${className}`}>
      <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">{title}</h4>
      <p className="text-[var(--text-primary)] text-sm leading-relaxed break-words">{content}</p>
    </div>
  );
};