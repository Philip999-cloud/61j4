import React from 'react';

export type GradingModel = 'standard' | 'strict' | 'creative' | 'socratic';

interface Props {
  selected: GradingModel;
  onSelect: (model: GradingModel) => void;
}

export const ModelSelector: React.FC<Props> = ({ selected, onSelect }) => {
  const models = [
    { id: 'standard', name: '標準模式 (Standard)', desc: '平衡評分與解析', icon: '⚖️', color: 'blue' },
    { id: 'strict', name: '語法專家 (Strict)', desc: '嚴格糾錯與規範', icon: '🔍', color: 'red' },
    { id: 'creative', name: '創意導師 (Creative)', desc: '鼓勵發想與表達', icon: '🎨', color: 'purple' },
    { id: 'socratic', name: '蘇格拉底 (Socratic)', desc: '提問引導思考', icon: '💡', color: 'amber' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 mb-2">
         <span className="text-xl">🤖</span>
         <h3 className="text-base font-bold text-[var(--text-primary)]">AI 模型與批改風格 (Model Persona)</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {models.map(m => {
          const isSelected = selected === m.id;
          const borderColor = isSelected 
             ? (m.color === 'blue' ? 'border-blue-500' : m.color === 'red' ? 'border-red-500' : m.color === 'purple' ? 'border-purple-500' : 'border-amber-500')
             : 'border-[var(--border-color)]';
          const ringColor = isSelected
             ? (m.color === 'blue' ? 'ring-blue-500/50' : m.color === 'red' ? 'ring-red-500/50' : m.color === 'purple' ? 'ring-purple-500/50' : 'ring-amber-500/50')
             : '';
          
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id as GradingModel)}
              className={`relative p-3 md:p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden group ${borderColor} ${isSelected ? 'bg-[var(--bg-card)] shadow-xl ring-1 ' + ringColor : 'bg-[var(--bg-main)] hover:bg-[var(--bg-card)]'}`}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                   <div className="text-2xl">{m.icon}</div>
                   {isSelected && <div className={`w-2 h-2 rounded-full bg-${m.color}-500 animate-pulse`}></div>}
                </div>
                <div className={`font-black text-xs text-[var(--text-primary)] break-words`}>{m.name}</div>
                <div className="text-[10px] text-[var(--text-secondary)] font-bold mt-1 break-words">{m.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};