import React from 'react';
import { X, History } from 'lucide-react';
import ResultsDisplay from './ResultsDisplay';

interface HistoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: any; // 存放完整的批改結果
  title?: string;
}

export const HistoryViewerModal: React.FC<HistoryViewerModalProps> = ({
  isOpen, onClose, resultData, title
}) => {
  if (!isOpen || !resultData) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[var(--bg-main)] w-full max-w-5xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-[var(--border-color)]">
        
        {/* 頂部標題區 */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--text-primary)] tracking-wide">
                {title || '歷史批改紀錄'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">
                  唯讀回顧模式 (Read-Only)
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-red-500 rounded-full transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* 內容區 - 直接重用您的 ResultsDisplay */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--bg-main)]">
          <div className="pointer-events-auto">
            {/* 放入完整的批改結果，此時 ResultsDisplay 會自動渲染所有圖表與評語 */}
            <ResultsDisplay results={resultData} />
          </div>
        </div>

      </div>
    </div>
  );
};
