import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { StemSubScore, MathStep, TextAnnotation, ParsedMathSegment } from '../../types';
import { transformToMathSteps, calculateStepwiseScore, getStepColor, getStepIcon } from '../../utils/mathScoringUtils';
import { VisualizationRenderer } from '../VisualizationRenderer';
import LatexRenderer from '../LatexRenderer';
import { enhanceTranscriptionMathForLatex } from '../../utils/stemTranscriptionMath';

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
    <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative shadow-inner">
      <div 
        className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-emerald-500 transition-all duration-1000 ease-out relative"
        style={{ width: `${percentage}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
      </div>
    </div>
  );
};

const InteractiveMathText: React.FC<{ 
  fullText: string; 
  annotations?: TextAnnotation[]; 
  segments?: ParsedMathSegment[]; 
}> = ({ fullText, annotations, segments }) => {
  const [activeItem, setActiveItem] = useState<{ type: string; explanation: string; correction?: string } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const stripSpaceCmd = (s: string) => s.replace(/\\(v|h)space\{?[a-zA-Z0-9\.\-\\]*\}?/g, ' ').trim();

  let contentToRender: { text: string; anno?: TextAnnotation; isError?: boolean; errorReason?: string; correction?: string }[] = [];

  const safeFullRaw = typeof fullText === 'string' ? fullText : String(fullText || '');
  const cleanFull = stripSpaceCmd(safeFullRaw);

  if (cleanFull) {
    type SplitPiece = { text: string; anno?: TextAnnotation; correction?: string; errorReason?: string };
    const splitKeys: SplitPiece[] = [];
    if (Array.isArray(annotations)) {
      for (const anno of annotations) {
        if (!anno.text || anno.text.length < 1) continue;
        const ck = stripSpaceCmd(anno.text);
        if (!ck) continue;
        splitKeys.push({ text: ck, anno });
      }
    }
    if (Array.isArray(segments)) {
      for (const seg of segments) {
        if (!seg.is_error || !seg.text?.trim()) continue;
        const ck = stripSpaceCmd(seg.text);
        if (!ck) continue;
        if (splitKeys.some((k) => k.text === ck)) continue;
        splitKeys.push({
          text: ck,
          anno: {
            text: ck,
            type: '錯誤分析',
            explanation: seg.error_reason || 'Check this step',
          },
          correction: seg.correction,
          errorReason: seg.error_reason,
        });
      }
    }
    splitKeys.sort((a, b) => b.text.length - a.text.length);

    let tempSegments: SplitPiece[] = [{ text: cleanFull }];
    for (const sk of splitKeys) {
      const newSegments: SplitPiece[] = [];
      tempSegments.forEach((seg) => {
        if (seg.anno) {
          newSegments.push(seg);
        } else {
          const parts = typeof seg.text === 'string' ? seg.text.split(sk.text) : [String(seg.text)];
          parts.forEach((part, i) => {
            if (part) newSegments.push({ text: part });
            if (i < parts.length - 1) {
              newSegments.push({
                text: sk.text,
                anno: sk.anno,
                correction: sk.correction,
                errorReason: sk.errorReason,
              });
            }
          });
        }
      });
      tempSegments = newSegments;
    }
    contentToRender = tempSegments.map((s) => ({
      text: s.text,
      anno: s.anno,
      correction: s.correction,
      errorReason: s.errorReason,
    }));
  } else if (segments && segments.length > 0) {
    contentToRender = segments.map((s) => ({
      text: s.text,
      isError: s.is_error,
      errorReason: s.error_reason,
      correction: s.correction,
    }));
  }

  if (contentToRender.length === 0) return null;

  return (
      <div className="relative font-sans text-lg leading-relaxed text-zinc-300 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-inner">
        <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 select-none">
           <span className="w-2 h-2 rounded-full bg-blue-500"></span>
           學生原始算式 (Original Calculation)
        </h5>
        
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-zinc-800/80 bg-black/20 px-2 py-3 sm:px-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 w-full min-w-0 break-words whitespace-pre-wrap [&_.katex]:text-[1.05em]">
            {contentToRender.map((seg, i) => {
              if (!seg.text) return null;

              const prepared = enhanceTranscriptionMathForLatex(seg.text);
              const isTable = /\\begin\s*\{(array|tabular|[bpvB]matrix|cases|align|gather)\}/.test(prepared);
              const isBlock = isTable || prepared.includes('$$');

              const content = (
                 <div className={isBlock ? "w-full overflow-x-auto my-2 block" : "inline-flex items-center"}>
                    <LatexRenderer content={prepared} isInline={!isBlock} />
                 </div>
              );

              if (seg.isError || seg.anno) {
                 const explanation = seg.errorReason || seg.anno?.explanation || "Check this step";
                 const type = seg.anno?.type || "錯誤分析";
                 const correction = seg.correction;

                 return (
                  <div 
                    key={i}
                    className={`relative group cursor-pointer ${isBlock ? "w-full block" : "inline-flex items-center"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPosition({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 10 });
                      setActiveItem({ type, explanation, correction });
                    }}
                  >
                    <div className={`rounded-lg bg-red-500/10 border border-red-500/50 text-red-300 hover:bg-red-500/20 transition-all ${isBlock ? "p-4 w-full" : "px-2 py-1"}`}>
                       {content}
                    </div>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  </div>
                 );
              } else {
                 return (
                   <div key={i} className={isBlock ? "w-full block text-zinc-300" : "inline-flex items-center text-zinc-300"}>
                      {content}
                   </div>
                 );
              }
            })}
          </div>
        </div>
  
        {activeItem && (
          <>
             <div className="fixed inset-0 z-40" onClick={() => setActiveItem(null)}></div>
             <div 
               className="fixed z-50 w-80 bg-zinc-800 !text-white rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-200 border border-zinc-700"
               style={{ 
                 top: Math.min(window.innerHeight - 300, position.y - window.scrollY),
                 left: Math.min(window.innerWidth - 340, position.x)
               }}
             >
                <div className="flex items-center gap-2 mb-3 border-b border-zinc-700 pb-2">
                   <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                    (activeItem.type?.includes('錯') || activeItem.type?.includes('誤') || activeItem.type?.includes('Error'))
                    ? "bg-red-500 text-white" 
                    : "bg-blue-500 text-white"
                 }`}>
                    {activeItem.type}
                 </span>
              </div>
              <p className="text-sm font-medium leading-relaxed !text-zinc-200 mb-2">{activeItem.explanation}</p>
              {activeItem.correction && (
                   <div className="mt-3 pt-3 border-t border-zinc-700 bg-zinc-900/50 p-3 rounded-lg">
                      <span className="text-[10px] !text-emerald-500 font-bold uppercase block mb-1">Corrected Value:</span>
                      <div className="!text-emerald-300 font-serif">
                          <LatexRenderer content={enhanceTranscriptionMathForLatex(activeItem.correction)} isInline={true} />
                      </div>
                   </div>
                )}
              <div className="absolute -top-2 left-4 w-4 h-4 bg-zinc-800 border-t border-l border-zinc-700 transform rotate-45"></div>
           </div>
        </>
      )}
    </div>
  );
};

// ... Helper: One Question Multiple Solutions ...
const renderAlternativeSolutions = (content: any) => {
  if (!content) return null;
  if (typeof content === 'string') return <LatexRenderer content={content} />;
  
  const renderItems = (items: any) => {
    const list = Array.isArray(items) ? items : [];
    return (
    <div className="space-y-4">
      {list.map((item, i) => (
        <div key={i} className="border-l-2 border-emerald-500/30 pl-4 py-1">
           <div className="text-[10px] font-black text-emerald-500 mb-2 tracking-widest uppercase opacity-70">Method {i+1}</div>
           <LatexRenderer content={typeof item === 'string' ? item : JSON.stringify(item)} />
        </div>
      ))}
    </div>
    );
  };

  if (Array.isArray(content)) return renderItems(content);
  if (typeof content === 'object') return renderItems(Object.values(content));
  
  return <LatexRenderer content={String(content)} />;
};

const ScoreMetric: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => {
  const achieved = score > 0;
  const bgClass = color.replace(/text-/g, 'bg-').replace(/500/g, '500/10').replace(/400/g, '400/10');
  const borderClass = color.replace(/text-/g, 'border-').replace(/500/g, '500/20').replace(/400/g, '400/20');

  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-colors ${
      !achieved
        ? 'bg-zinc-500/10 border-zinc-500/20 shadow-inner'
        : `${bgClass} ${borderClass}`
    }`}>
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2 text-zinc-500">
          {label}
        </span>
        {achieved ? (
          <Check className={`w-6 h-6 mx-auto stroke-[3] ${color}`} />
        ) : (
          <X className="w-6 h-6 mx-auto stroke-[3] opacity-50 text-zinc-400 dark:text-zinc-500" />
        )}
    </div>
  );
};

const AstMathAStrategy: React.FC<Props> = ({ data, subjectName, originalText, isSolutionOnly }) => {
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      {rows.map((sub, idx) => {
        if (!sub) return null;
        const steps = transformToMathSteps(sub, subjectName);
        const safeSteps = Array.isArray(steps) ? steps : [];

        // Safe extraction of 4-dimensional scores for detailed view
        const val = (n: unknown) => {
          const x = Number(n ?? 0);
          return Number.isFinite(x) ? x : 0;
        };
        const setupScore = val(sub.setup);
        const processScore = val(sub.process);
        const logicScore = val(sub.logic);
        const resultScore = val(sub.result);

        return (
          <div key={idx} className="bg-zinc-950 rounded-[2.5rem] p-8 border border-zinc-900 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8 relative z-10">
               <div className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 font-black text-xl border border-zinc-800 shadow-inner">
                    {sub.sub_id || idx + 1}
                  </span>
                  <div>
                    <h3 className="text-zinc-100 font-bold text-lg">
                       {isSolutionOnly ? '標準解析' : '演算流程深度評核'}
                    </h3>
                    {!isSolutionOnly && (
                       <div className="mt-2 flex flex-wrap items-end gap-6">
                          <div>
                            <div className="text-base font-black tracking-wider uppercase text-zinc-500">
                              MAX score
                            </div>
                            <div className="text-5xl font-black leading-none tabular-nums text-zinc-100">
                              {sub.max_points}
                            </div>
                          </div>
                          <div>
                            <div className="text-base font-black tracking-wider uppercase text-zinc-500">
                              Actual score
                            </div>
                            <div className="text-5xl font-black leading-none tabular-nums text-zinc-100">
                              {calculateStepwiseScore(safeSteps)}
                            </div>
                          </div>
                       </div>
                    )}
                  </div>
               </div>
               
               <div className="flex gap-2">
                  {sub.knowledge_tags?.map((tag, tIdx) => (
                    <span key={tIdx} className="px-3 py-1 bg-zinc-900 text-zinc-400 text-[10px] font-black rounded-full border border-zinc-800 uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
               </div>
            </div>

            {!isSolutionOnly && (
              <div className="mb-8 relative z-10">
                 <div className="grid grid-cols-4 gap-4 mb-6">
                    <ScoreMetric label="Setup (列式)" score={setupScore} color="text-blue-400" />
                    <ScoreMetric label="Process (運算)" score={processScore} color="text-purple-400" />
                    <ScoreMetric label="Logic (邏輯)" score={logicScore} color="text-amber-400" />
                    <ScoreMetric label="Result (答案)" score={resultScore} color="text-emerald-400" />
                 </div>
                 
                 <MathProgressBar steps={safeSteps} />
              </div>
            )}
            
            <div className="space-y-4 relative z-10 mb-8">
              {safeSteps.map((step, sIdx) => {
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
               <div className="p-6 bg-zinc-900/50 rounded-[2rem] border border-zinc-800/50 flex flex-col">
                  <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                     {isSolutionOnly ? '解題思路 (Strategy)' : '閱卷官點評 (Examiner Feedback)'}
                  </h5>
                  <div className="text-zinc-300 text-sm leading-loose font-medium flex-grow">
                     <LatexRenderer content={sub.feedback} />
                  </div>
               </div>

               <div className="space-y-6">
                  {sub.concept_correction && sub.concept_correction.length > 2 && (
                    <div className="p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/10">
                        <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          觀念辯正 (Misconceptions)
                        </h5>
                        <div className="text-amber-200/80 text-sm leading-relaxed">
                          <LatexRenderer content={sub.concept_correction} />
                        </div>
                    </div>
                  )}
                  
                  {sub.alternative_solutions && (
                     <div className="p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10">
                        <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          一題多解 (Alternative Approach)
                        </h5>
                        <div className="text-emerald-200/80 text-sm leading-relaxed">
                           {renderAlternativeSolutions(sub.alternative_solutions)}
                        </div>
                     </div>
                  )}
               </div>
            </div>
            
            {!isSolutionOnly && (sub.student_input_parsing?.segments || (sub.annotations && sub.annotations.length > 0) || originalText) && (
               <div className="mt-8 relative z-10">
                  <InteractiveMathText 
                    fullText={originalText || ""} 
                    annotations={sub.annotations} 
                    segments={sub.student_input_parsing?.segments}
                  />
               </div>
            )}
            
            {sub.visualization_code && (
               <VisualizationRenderer content={sub.visualization_code} />
            )}

            {sub.correct_calculation && (
               <div className="mt-8 relative z-10 bg-black/40 p-6 rounded-[2rem] border border-zinc-800">
                  <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                     {isSolutionOnly ? '標準演算流程 (Standard Derivation)' : '參考詳解 (Reference Solution)'}
                  </h5>
                  <div className="font-serif text-zinc-300 text-base leading-loose">
                     <LatexRenderer content={sub.correct_calculation} />
                  </div>
               </div>
            )}

            <div className="absolute -top-24 -right-24 w-64 h-64 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        );
      })}
    </div>
  );
};

export { AstMathAStrategy };
