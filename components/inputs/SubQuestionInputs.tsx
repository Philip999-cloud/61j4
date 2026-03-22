import React, { useState, lazy, Suspense } from 'react';
import { QuestionSet } from '../../types';
import { AseaUploadField } from '../common/AseaUploadField';

const ChemicalEditor = lazy(() =>
  import('../ChemicalEditor').then((m) => ({ default: m.ChemicalEditor }))
);

interface SubQuestionInputsProps {
  num: number;
  icon: string;
  data: QuestionSet;
  onUpdate: (field: keyof QuestionSet, value: any) => void;
  subject?: string;
}

export const SubQuestionInputs: React.FC<SubQuestionInputsProps> = ({ num, icon, data, onUpdate, subject }) => {
  const [showChemicalEditor, setShowChemicalEditor] = useState(false);
  const isChemistry = subject === '化學' || subject === 'Chemistry';

  const handleChemicalSave = (smiles: string) => {
    const currentText = data.text || '';
    const newText = currentText ? `${currentText}\n${smiles}` : smiles;
    onUpdate('text', newText);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2 border-b border-[var(--border-color)] pb-2">
         <span className="w-6 h-6 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-xs font-black text-[var(--text-primary)]">{num}</span>
         <h3 className="text-sm font-bold text-[var(--text-primary)]">第 {num} 小題</h3>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         <AseaUploadField 
           id={`tour-q-s${num}q1`}
           icon={icon} 
           title="題目" 
           images={data.q} 
           onUpload={(imgs) => onUpdate('q', imgs)} 
           onRemove={(i) => onUpdate('q', data.q.filter((_, idx) => idx !== i))} 
         />
         <AseaUploadField 
           id={`tour-r-s${num}q1`}
           icon="📖" 
           title="參考/詳解" 
           images={data.r} 
           onUpload={(imgs) => onUpdate('r', imgs)} 
           onRemove={(i) => onUpdate('r', data.r.filter((_, idx) => idx !== i))} 
         />
         
         <div id={`tour-s-s${num}q1`} className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✍️</span>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">學生作答 (必填)</h3>
                </div>
                
                <div className="flex gap-1 p-0.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full">
                    <button 
                        onClick={() => onUpdate('mode', 'image')} 
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${data.mode === 'image' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        影像上傳
                    </button>
                    <button 
                        onClick={() => onUpdate('mode', 'text')} 
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${data.mode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        文字輸入
                    </button>
                </div>
            </div>

            {data.mode === 'image' ? (
                <AseaUploadField 
                    images={data.s} 
                    onUpload={(imgs) => onUpdate('s', imgs)} 
                    onRemove={(i) => onUpdate('s', data.s.filter((_, idx) => idx !== i))} 
                />
            ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 rounded-2xl min-h-[200px] flex flex-col p-2 relative group transition-colors hover:border-blue-400 dark:hover:border-blue-500">
                    {isChemistry && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          id="tour-chem-editor-btn"
                          onClick={() => setShowChemicalEditor(true)}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors shadow-sm flex items-center gap-1"
                        >
                          <span>🧪</span> 開啟化學繪圖板
                        </button>
                      </div>
                    )}
                    <textarea
                        value={data.text || ''}
                        onChange={(e) => onUpdate('text', e.target.value)}
                        placeholder="在此輸入學生作答內容..."
                        className="w-full h-full min-h-[180px] bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white text-sm leading-relaxed p-4 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                </div>
            )}
         </div>
      </div>

      {showChemicalEditor && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-2xl flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">載入化學繪圖板…</span>
              </div>
            </div>
          }
        >
          <ChemicalEditor
            onSave={handleChemicalSave}
            onClose={() => setShowChemicalEditor(false)}
          />
        </Suspense>
      )}
    </div>
  );
};