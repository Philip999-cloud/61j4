
import React from 'react';
import { Subject } from '../types';

interface Props {
  onSelect: (subject: Subject) => void;
  selectedId?: string;
}

const gsatSubjects: Subject[] = [
  { id: 'gsat-chinese', name: '國語文寫作能力測驗', category: 'GSAT' },
  { id: 'gsat-english', name: '英文作文', category: 'GSAT' },
  { id: 'gsat-math-a', name: '數學 A', category: 'GSAT' },
  { id: 'gsat-math-b', name: '數學 B', category: 'GSAT' },
  { id: 'gsat-science', name: '自然科（ 手寫/推理部分 ）', category: 'GSAT' },
];

const astSubjects: Subject[] = [
  { id: 'ast-math-a', name: '數學甲', category: 'AST' },
  { id: 'ast-physics', name: '物理', category: 'AST' },
  { id: 'ast-chemistry', name: '化學', category: 'AST' },
  { id: 'ast-biology', name: '生物', category: 'AST' },
];

export const SubjectSelector: React.FC<Props> = ({ onSelect, selectedId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 animate-in fade-in zoom-in-95 duration-700">
      {/* GSAT Card */}
      <div className="bg-[var(--bg-card)] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col group transition-all duration-500 hover:shadow-blue-500/10 backdrop-blur-sm">
        <div className="p-6 md:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-10 min-w-0">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 dark:bg-blue-900/40 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight break-words">學測 GSAT</h2>
              <p className="text-[var(--text-secondary)] text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 break-words">General Scholastic Ability Test</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {gsatSubjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => onSelect(sub)}
                className={`w-full text-left px-5 py-4 md:px-8 md:py-5 rounded-2xl border transition-all duration-300 group/btn ${
                  selectedId === sub.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-black shadow-lg' 
                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-blue-200 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-zinc-900 font-bold bg-[var(--bg-button)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base md:text-lg break-words min-w-0">{sub.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover/btn:opacity-100 transition-opacity hidden md:block flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AST Card */}
      <div className="bg-[var(--bg-card)] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col group transition-all duration-500 hover:shadow-emerald-500/10 backdrop-blur-sm">
        <div className="p-6 md:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-10 min-w-0">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-3xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight break-words">分科測驗 AST</h2>
              <p className="text-[var(--text-secondary)] text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 break-words">Advanced Subjects Test</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {astSubjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => onSelect(sub)}
                className={`w-full text-left px-5 py-4 md:px-8 md:py-5 rounded-2xl border transition-all duration-300 group/btn ${
                  selectedId === sub.id 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-black shadow-lg' 
                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-zinc-900 font-bold bg-[var(--bg-button)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base md:text-lg break-words min-w-0">{sub.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover/btn:opacity-100 transition-opacity hidden md:block flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


