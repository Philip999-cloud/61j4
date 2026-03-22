import React, { useState } from 'react';
import { StemSubScore, MathStep, TextAnnotation, ParsedMathSegment } from '../../types';
import { transformToMathSteps, calculateStepwiseScore, getStepColor, getStepIcon } from '../../utils/mathScoringUtils';
import { VisualizationRenderer } from '../VisualizationRenderer';
import LatexRenderer from '../LatexRenderer';
import { Viewer3D } from '../Viewer3D';
import { InteractiveArticle } from '../common/InteractiveArticle';

interface Props {
  data: StemSubScore[];
  subjectName: string;
  originalText?: string;
  isSolutionOnly?: boolean;
}

const MathProgressBar: React.FC<{ steps: MathStep[] }> = ({ steps }) => {
  const total = steps.reduce((acc, s) => acc + s.maxPoints, 0);
  const achieved = calculateStepwiseScore(steps);
  const percentage = total > 0 ? Math.min(100, Math.max(0, (achieved / total) * 100)) : 0;

  return (
    <div className="w-full h-4 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)] relative shadow-inner transition-colors">
      <div 
        className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-emerald-500 transition-all duration-1000 ease-out relative"
        style={{ width: `${percentage}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
      </div>
    </div>
  );
};



const renderAlternativeSolutions = (content: any) => {
  if (!content) return null;
  if (typeof content === 'string') return <LatexRenderer content={content} />;
  
  const renderItems = (items: any[]) => (
    <div className="space-y-4">
      {items.map((item, i) => {
        let contentToRender = '';
        if (typeof item === 'string') {
          contentToRender = item;
        } else if (Array.isArray(item)) {
          contentToRender = item.join('\n');
        } else {
          contentToRender = JSON.stringify(item);
        }

        return (
          <div key={i} className="border-l-2 border-emerald-500/30 pl-4 py-1">
             <div className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 mb-2 tracking-widest uppercase opacity-70">Method {i+1}</div>
             <LatexRenderer content={contentToRender} />
          </div>
        );
      })}
    </div>
  );

  if (Array.isArray(content)) return renderItems(content);
  if (typeof content === 'object') return renderItems(Object.values(content));
  
  return <LatexRenderer content={String(content)} />;
};

const ScoreMetric: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => {
  const isZero = score === 0;
  const bgClass = color.replace(/text-/g, 'bg-').replace(/500/g, '500/10').replace(/400/g, '400/10');
  const borderClass = color.replace(/text-/g, 'border-').replace(/500/g, '500/20').replace(/400/g, '400/20');
  
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-colors ${
      isZero 
        ? 'bg-zinc-500/10 border-zinc-500/20 shadow-inner'
        : `${bgClass} ${borderClass}`
    }`}>
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-secondary)]">
          {label}
        </span>
        <span className={`text-2xl font-black ${
          isZero 
            ? 'text-zinc-400 dark:text-zinc-500'
            : color
        }`}>
          {score}
        </span>
    </div>
  );
};

const AstMathAStrategy: React.FC<Props> = ({ data, subjectName, originalText, isSolutionOnly }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      {data.map((sub, idx) => {
        if (!sub) return null;
        try {
          const steps = transformToMathSteps(sub, subjectName);

          const val = (n: number | undefined) => (typeof n === 'number' && !isNaN(n)) ? n : 0;
          const setupScore = val(sub.setup);
          const processScore = val(sub.process);
          const logicScore = val(sub.logic);
          const resultScore = val(sub.result);

          return (
            <div key={idx} className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 border border-[var(--border-color)] shadow-2xl relative overflow-hidden group transition-colors">
              <div className="flex items-center justify-between mb-8 relative z-10">
                 <div className="flex items-center gap-4">
                    <span className="w-12 h-12 rounded-2xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-secondary)] font-black text-xl border border-[var(--border-color)] shadow-inner transition-colors">
                      {sub.sub_id || idx + 1}
                    </span>
                    <div>
                      <h3 className="text-[var(--text-primary)] font-bold text-lg">
                         {isSolutionOnly ? '標準解析' : '演算流程深度評核'}
                      </h3>
                      {!isSolutionOnly && (
                         <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                            <span>Max: {sub.max_points}</span>
                            <span className="opacity-50">•</span>
                            <span>Total Actual: <span className="text-[var(--text-primary)] font-bold">{calculateStepwiseScore(steps)}</span></span>
                         </div>
                      )}
                    </div>
                 </div>
                 
                 <div className="flex gap-2">
                    {sub.knowledge_tags?.map((tag, tIdx) => (
                      <span key={tIdx} className="px-3 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] text-[10px] font-black rounded-full border border-[var(--border-color)] uppercase tracking-wider transition-colors">
                        {tag}
                      </span>
                    ))}
                 </div>
              </div>

              {!isSolutionOnly && (
                <div className="mb-8 relative z-10">
                   <div className="grid grid-cols-4 gap-4 mb-6">
                      <ScoreMetric label="Setup (列式)" score={setupScore} color="text-blue-500 dark:text-blue-400" />
                      <ScoreMetric label="Process (運算)" score={processScore} color="text-purple-500 dark:text-purple-400" />
                      <ScoreMetric label="Logic (邏輯)" score={logicScore} color="text-amber-500 dark:text-amber-400" />
                      <ScoreMetric label="Result (答案)" score={resultScore} color="text-emerald-500 dark:text-emerald-400" />
                   </div>
                   
                   <MathProgressBar steps={steps} />
                </div>
              )}
              
              <div className="space-y-4 relative z-10 mb-8">
                {steps.map((step, sIdx) => {
                   const colorClass = getStepColor(step.type, isSolutionOnly ? true : step.isAchieved);
                   const icon = getStepIcon(step.type);
                   
                   return (
                     <div key={sIdx} className={`p-5 rounded-2xl border flex gap-4 transition-all hover:scale-[1.01] ${colorClass}`}>
                        <div className="text-2xl pt-1 opacity-80">{icon}</div>
                        <div className="flex-grow">
                           <div className="flex justify-between items-center mb-1">
                              <h4 className="text-xs font-black uppercase tracking-widest opacity-70">{step.label}</h4>
                              {!isSolutionOnly && (
                                <span className="text-[10px] font-bold opacity-60">
                                  {step.pointsAchieved} / {step.maxPoints}
                                </span>
                              )}
                           </div>
                           <div className="text-sm font-medium leading-relaxed opacity-90">
                             <LatexRenderer content={step.feedback || (isSolutionOnly ? "標準步驟解析" : "未偵測到此步驟")} />
                           </div>
                        </div>
                     </div>
                   );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                 <div className="p-6 bg-[var(--bg-main)] rounded-[2rem] border border-[var(--border-color)] flex flex-col transition-colors">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                       {isSolutionOnly ? '解题思路 (Strategy)' : '閱卷官點評 (Examiner Feedback)'}
                    </h5>
                    <div className="text-[var(--text-primary)] text-sm leading-loose font-medium flex-grow">
                       <LatexRenderer content={sub.feedback} />
                    </div>
                 </div>

                 <div className="space-y-6">
                    {sub.concept_correction && sub.concept_correction.length > 2 && (
                      <div className="p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/20">
                          <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            觀念辯正 (Misconceptions)
                          </h5>
                          <div className="text-[var(--text-primary)] text-sm leading-relaxed">
                            <LatexRenderer content={sub.concept_correction} />
                          </div>
                      </div>
                    )}
                    
                    {sub.alternative_solutions && (
                       <div className="p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/20">
                          <h5 className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            一題多解 (Alternative Approach)
                          </h5>
                          <div className="text-[var(--text-primary)] text-sm leading-relaxed">
                             {renderAlternativeSolutions(sub.alternative_solutions)}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
              
              {!isSolutionOnly && (originalText) && (
                 <div className="mt-8 relative z-10 bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-xl transition-colors duration-300">
                    <h3 className="text-red-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2 mb-4">
                       <span className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">🔍</span>
                       學生作答轉錄與批改 (Original Response)
                    </h3>
                    <InteractiveArticle 
                      fullText={originalText || ""} 
                      fixes={sub.annotations ? sub.annotations.map(anno => ({
                         original: anno.text,
                         corrected: '請參考診斷',
                         type: anno.type,
                         logic: anno.explanation,
                         refined: ''
                      })) : []}
                      className="font-serif text-[var(--text-primary)] text-base leading-loose"
                    />
                 </div>
              )}
              
              {sub.visualization_code && (
                 (subjectName.includes('化學') || subjectName.includes('Chemistry')) && 
                 (typeof sub.visualization_code === 'string' && /^\d+$/.test(sub.visualization_code.trim()) || 
                  (typeof sub.visualization_code === 'object' && (sub.visualization_code.type === 'mol3d' || sub.visualization_code.cid))) ? (
                   <div className="mt-8 relative z-10 bg-[var(--bg-main)] p-6 rounded-[2rem] border border-[var(--border-color)] transition-colors">
                     <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       3D 分子結構 (3D Molecular Model)
                     </h5>
                     <Viewer3D cid={typeof sub.visualization_code === 'string' ? sub.visualization_code.trim() : sub.visualization_code.cid} />
                   </div>
                 ) : (
                   <VisualizationRenderer content={sub.visualization_code} />
                 )
              )}

              {sub.correct_calculation && (
                 <div className="mt-8 relative z-10 bg-[var(--bg-main)] p-6 rounded-[2rem] border border-[var(--border-color)] transition-colors">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                       {isSolutionOnly ? '標準演算流程 (Standard Derivation)' : '參考詳解 (Reference Solution)'}
                    </h5>
                    <div className="font-serif text-[var(--text-primary)] text-base leading-loose">
                       <LatexRenderer content={sub.correct_calculation} />
                    </div>
                 </div>
              )}
            </div>
          );
        } catch (error) {
          console.error('[Grading Fatal Error]', error, '\nPayload:', sub);
          return <div key={idx} className="p-4 bg-red-500/10 text-red-500 border border-red-500 rounded-xl my-4">圖表或步驟渲染失敗，請重試或回報。</div>;
        }
      })}
    </div>
  );
};

export { AstMathAStrategy };
