import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  StemSubScore,
  MathStep,
  TextAnnotation,
  ParsedMathSegment,
  type AlternativeMethod,
} from '../../types';
import {
  transformToMathSteps,
  calculateStepwiseScore,
  getStepColor,
  getStepIcon,
  resolveStemDisciplineForSub,
  resolveStemDisciplineFromSubject,
  stemSubjectHidesFourMetricRow,
  stemDisplayDisciplineLabelZh,
} from '../../utils/mathScoringUtils';
import { VisualizationRenderer } from '../VisualizationRenderer';
import LatexRenderer from '../LatexRenderer';
import { ZeroCompressionBlocks, zeroCompressionHasContent } from '../science/ZeroCompressionBlocks';
import { CeecAnswerSheetFooter } from '../ceec/CeecAnswerSheetFooter';
import { MicroLessonBlock } from '../micro-lessons/MicroLessonBlock';
import { AlternativeMethodsAccordion } from '../common/AlternativeMethodsAccordion';
import { Viewer3D } from '../Viewer3D';
import { enhanceTranscriptionMathForLatex } from '../../utils/stemTranscriptionMath';
import type { GeometryJSON } from '@/src/types/geometry';
import {
  filterRenderableVisualizations,
  geometryJsonItemRenderable,
} from '../../utils/validateStemVisualization';

interface Props {
  data: StemSubScore[];
  subjectName: string;
  originalText?: string;
  isSolutionOnly?: boolean;
  prefetchedQuestionGeometry?: GeometryJSON | null;
  onRetryQuestionGeometryExtraction?: () => void;
  /** Phase 3 根層學習引導（與 ResultsDisplay 成長路線圖同源） */
  growthRoadmap?: string[] | null;
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

  /** 只要有學生全文，一律以全文為準，再把圈選／錯誤 segment 當成子字串高亮（避免模型只回傳部分 segment 時漏行）。 */
  if (cleanFull) {
    type SplitPiece = {
      text: string;
      anno?: TextAnnotation;
      correction?: string;
      errorReason?: string;
    };
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
  } else if (Array.isArray(segments) && segments.length > 0) {
    contentToRender = segments.map((s) => ({
      text: s.text,
      isError: s.is_error,
      errorReason: s.error_reason,
      correction: s.correction,
    }));
  }

  if (contentToRender.length === 0) return null;

  return (
    <div className="relative font-sans text-lg leading-relaxed text-[var(--text-primary)] bg-[var(--bg-main)] p-6 rounded-[1.5rem] border border-[var(--border-color)] shadow-inner transition-colors">
      <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2 select-none">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        學生原始作答 (Original Response)
      </h5>

      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-[var(--border-color)]/50 bg-[var(--bg-card)]/40 px-2 py-3 sm:px-4">
        <div className="min-w-0 break-words whitespace-pre-wrap leading-loose [&_.katex]:text-[1.05em] [&_.katex-display]:my-3">
          {contentToRender.map((seg, i) => {
            if (!seg.text) return null;

            const prepared = enhanceTranscriptionMathForLatex(seg.text);
            const isTable = /\\begin\s*\{(array|tabular|[bpvB]matrix|cases|align|gather)\}/.test(prepared);
            const isBlock = isTable || prepared.includes('$$');

            if (seg.isError || seg.anno) {
              const explanation = seg.errorReason || seg.anno?.explanation || 'Check this step';
              const type = seg.anno?.type || '錯誤分析';
              const correction = seg.correction;

              return (
                <span
                  key={i}
                  className={`relative group cursor-pointer ${isBlock ? 'w-full block my-3' : 'inline-block align-baseline mx-0.5'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPosition({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 10 });
                    setActiveItem({ type, explanation, correction });
                  }}
                >
                  <span
                    className={`rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all ${isBlock ? 'p-4 w-full block' : 'px-1.5 py-0.5'}`}
                  >
                    <LatexRenderer content={prepared} isInline={!isBlock} />
                  </span>
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </span>
              );
            }
            return (
              <span key={i} className={isBlock ? 'w-full block my-3' : 'inline'}>
                <LatexRenderer content={prepared} isInline={!isBlock} className="inline" />
              </span>
            );
          })}
        </div>
      </div>

      {activeItem && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveItem(null)}></div>
          <div
            className="fixed z-50 w-80 bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-200 border border-[var(--border-color)]"
            style={{
              top: Math.min(window.innerHeight - 300, position.y - window.scrollY),
              left: Math.min(window.innerWidth - 340, position.x),
            }}
          >
            <div className="flex items-center gap-2 mb-3 border-b border-[var(--border-color)] pb-2">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  activeItem.type?.includes('錯') ||
                  activeItem.type?.includes('誤') ||
                  activeItem.type?.includes('Error')
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {activeItem.type}
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed mb-2">{activeItem.explanation}</p>
            {activeItem.correction && (
              <div className="mt-3 pt-3 border-t border-[var(--border-color)] bg-[var(--bg-main)] p-3 rounded-lg">
                <span className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">Corrected Value:</span>
                <div className="text-emerald-600 dark:text-emerald-400 font-serif">
                  <LatexRenderer content={enhanceTranscriptionMathForLatex(activeItem.correction)} isInline={true} />
                </div>
              </div>
            )}
            <div className="absolute -top-2 left-4 w-4 h-4 bg-[var(--bg-card)] border-t border-l border-[var(--border-color)] transform rotate-45"></div>
          </div>
        </>
      )}
    </div>
  );
};

/** 擬真作答區：無 ceec_answer_sheet 時仍顯示格式範例（來自標準解，非批改邏輯） */
function buildCeecExampleFormatHint(sub: StemSubScore, fullCalcHint?: boolean): string {
  const z = sub.zero_compression;
  const parts: string[] = [];
  if (z?.answer?.trim()) {
    parts.push(`【建議結論／填答方向】\n${z.answer.trim()}`);
  }
  const calc = typeof sub.correct_calculation === 'string' ? sub.correct_calculation.trim() : '';
  if (calc) {
    const cap = fullCalcHint ? 50_000 : 900;
    parts.push(
      `【書寫／演算參考（請依試卷欄位調整行距）】\n${calc.length > cap ? `${calc.slice(0, cap)}…` : calc}`
    );
  }
  return parts.join('\n\n').trim();
}

/** 與 VisualizationRenderer 說明區相同：讓單一 \\n 在下游 Markdown 路徑保留為換行 */
function altSolutionsHardBreaks(text: string): string {
  if (typeof text !== 'string' || !text.includes('\n')) return text;
  return text.split('\n').join('  \n');
}

function normalizeAlternativeMethods(raw: unknown): AlternativeMethod[] {
  if (!Array.isArray(raw)) return [];
  const out: AlternativeMethod[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const method_name = typeof o.method_name === 'string' ? o.method_name.trim() : '';
    const description = typeof o.description === 'string' ? o.description.trim() : '';
    const steps = Array.isArray(o.steps)
      ? o.steps
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim())
      : [];
    if (!method_name && !description && steps.length === 0) continue;
    out.push({
      method_name: method_name || `方法 ${out.length + 1}`,
      description,
      steps,
    });
  }
  return out;
}

/** 模型常把一題多解打成單一字串、物件或混雜型別；統一成可渲染字串陣列（結構化物件每解法一條，禁止 Object.values 合併污染） */
function normalizeAlternativeSolutions(raw: unknown): string[] {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (typeof item === 'string' && item.trim()) {
        out.push(item.trim());
      } else if (item != null && typeof item === 'object' && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        const hasStructured =
          typeof o.method_name === 'string' ||
          typeof o.description === 'string' ||
          Array.isArray(o.steps);
        if (hasStructured) {
          const name = typeof o.method_name === 'string' ? o.method_name.trim() : '';
          const desc = typeof o.description === 'string' ? o.description.trim() : '';
          const stepStrs = Array.isArray(o.steps)
            ? o.steps
                .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
                .map((s) => s.trim())
            : [];
          const body = [desc, ...stepStrs].filter(Boolean).join('\n\n');
          const block = [name, body].filter(Boolean).join('\n\n');
          if (block) out.push(block);
        } else {
          out.push(JSON.stringify(item));
        }
      }
    }
    return out;
  }
  if (typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((s) => s.trim());
  }
  return [];
}

const renderAlternativeSolutions = (content: unknown, stemRowKey: string) => {
  if (!content) return null;
  if (typeof content === 'string') {
    return <LatexRenderer content={altSolutionsHardBreaks(content)} />;
  }

  const renderItems = (items: unknown[]) => {
    const list = Array.isArray(items) ? items : [];
    return (
      <div className="space-y-4">
        {list.map((item, i) => {
          let contentToRender = '';
          if (typeof item === 'string') {
            contentToRender = altSolutionsHardBreaks(item);
          } else if (Array.isArray(item)) {
            contentToRender = altSolutionsHardBreaks(item.map(String).join('\n'));
          } else {
            contentToRender = JSON.stringify(item);
          }

          return (
            <div key={`${stemRowKey}-alt-legacy-${i}`} className="border-l-2 border-emerald-500/30 pl-4 py-1">
              <div className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 mb-2 tracking-widest uppercase opacity-70">
                Method {i + 1}
              </div>
              <LatexRenderer content={contentToRender} />
            </div>
          );
        })}
      </div>
    );
  };

  if (Array.isArray(content)) return renderItems(content);
  if (typeof content === 'object') return renderItems(Object.values(content as Record<string, unknown>));

  return <LatexRenderer content={altSolutionsHardBreaks(String(content))} />;
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
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2 text-[var(--text-secondary)]">
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

const AstMathAStrategy: React.FC<Props> = ({
  data,
  subjectName,
  originalText,
  isSolutionOnly,
  prefetchedQuestionGeometry,
  onRetryQuestionGeometryExtraction,
  growthRoadmap,
}) => {
  const rows = Array.isArray(data) ? data : [];
  const isAstMathA =
    subjectName.includes('數學甲') ||
    subjectName.includes('數甲') ||
    /math\s*a\s*\(\s*ast\s*\)/i.test(subjectName);
  /** 與 stemPhase3DisplayNormalize 生物判斷一致：策略同時要求 zero_compression 與 correct_calculation，須併陳 */
  const isBiologyStem =
    subjectName.includes('生物') || /biology/i.test(subjectName);
  const roadmapSteps = Array.isArray(growthRoadmap)
    ? growthRoadmap.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      {isAstMathA && roadmapSteps.length > 0 && (
        <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 shadow-xl relative z-10">
          <h3 className="text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-tighter mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {isSolutionOnly ? '重點總結與引導' : '學習引導與後續精進'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roadmapSteps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/60 p-3">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-[10px]">
                  {i + 1}
                </span>
                <div className="text-[var(--text-primary)] text-sm font-medium leading-relaxed min-w-0 break-words">
                  <LatexRenderer content={step} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.map((sub, idx) => {
        if (!sub) return null;
        const stemRowKey =
          sub.sub_id != null && String(sub.sub_id).trim() !== ''
            ? `stem-${String(sub.sub_id)}`
            : `stem-idx-${idx}`;
        try {
          /** 僅數學保留上排四格＋進度條；其餘 stem 學門見 stemSubjectHidesFourMetricRow。 */
          const stemSubjectBase = resolveStemDisciplineFromSubject(subjectName);
          const hideFourMetricRow = stemSubjectHidesFourMetricRow(stemSubjectBase);

          const stemDiscipline = resolveStemDisciplineForSub(subjectName, sub);
          const stemDisciplineZh = stemDisplayDisciplineLabelZh(stemDiscipline);
          const showStemDisciplineRow = stemSubjectBase === 'integrated';
          const steps = transformToMathSteps(sub, subjectName);
          const safeSteps = Array.isArray(steps) ? steps : [];

          const val = (n: unknown) => {
            const x = Number(n ?? 0);
            return Number.isFinite(x) ? x : 0;
          };
          const setupScore = val(sub.setup);
          const processScore = val(sub.process);
          const logicScore = val(sub.logic);
          const resultScore = val(sub.result);
          const maxPointsDisplay = (() => {
            const m = Number(sub.max_points);
            return Number.isFinite(m) ? m : '—';
          })();

          return (
            <div key={`${stemRowKey}-${idx}`} className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 border border-[var(--border-color)] shadow-2xl relative overflow-x-auto overflow-y-visible group transition-colors">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between relative z-10">
                 <div className="flex min-w-0 flex-1 items-start gap-4">
                    <span className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-secondary)] font-black text-xl border border-[var(--border-color)] shadow-inner transition-colors">
                      {sub.sub_id || idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[var(--text-primary)] font-bold text-lg">
                         {isSolutionOnly ? '標準解析' : '演算流程深度評核'}
                      </h3>
                      {showStemDisciplineRow ? (
                        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600/90 dark:text-blue-400/95">
                          <span className="rounded-md bg-blue-500/15 px-1.5 py-0.5 text-blue-700 dark:text-blue-300">
                            子題學門提示
                          </span>
                          <span className="ml-2 font-sans font-bold normal-case tracking-normal text-[var(--text-primary)]">
                            子題「{sub.sub_id?.trim() || `第 ${idx + 1} 小題`}」屬於「{stemDisciplineZh}」
                          </span>
                          <span className="ml-2 font-sans font-medium normal-case tracking-normal text-[var(--text-secondary)]">
                            （下方三向度說明隨此學門切換）
                            {sub.sub_stem_discipline ? '' : '；未標注時由內文推估，僅供參考'}
                          </span>
                        </p>
                      ) : null}
                      {!isSolutionOnly && (
                         <div className="mt-2 flex flex-wrap items-end gap-6">
                            <div className="shrink-0 min-w-[6rem]">
                              <div className="text-base font-black tracking-wider uppercase text-[var(--text-secondary)]">
                                MAX score
                              </div>
                              <div className="text-5xl font-black leading-none tabular-nums text-[var(--text-primary)] min-h-[3rem]">
                                {maxPointsDisplay}
                              </div>
                            </div>
                            <div className="shrink-0 min-w-[6rem]">
                              <div className="text-base font-black tracking-wider uppercase text-[var(--text-secondary)]">
                                Actual score
                              </div>
                              <div className="text-5xl font-black leading-none tabular-nums text-[var(--text-primary)] min-h-[3rem]">
                                {calculateStepwiseScore(safeSteps)}
                              </div>
                            </div>
                         </div>
                      )}
                    </div>
                 </div>
                 
                 <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end sm:max-w-[min(100%,24rem)]">
                    {Array.isArray(sub.knowledge_tags) &&
                      sub.knowledge_tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-3 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] text-[10px] font-black rounded-full border border-[var(--border-color)] uppercase tracking-wider transition-colors">
                        {tag}
                      </span>
                    ))}
                 </div>
              </div>

              {!isSolutionOnly && !hideFourMetricRow && (
                <div className="mb-8 relative z-10">
                   <div className="grid grid-cols-4 gap-4 mb-6">
                      <ScoreMetric label="Setup (列式)" score={setupScore} color="text-blue-500 dark:text-blue-400" />
                      <ScoreMetric label="Process (運算)" score={processScore} color="text-purple-500 dark:text-purple-400" />
                      <ScoreMetric label="Logic (邏輯)" score={logicScore} color="text-amber-500 dark:text-amber-400" />
                      <ScoreMetric label="Result (答案)" score={resultScore} color="text-emerald-500 dark:text-emerald-400" />
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
                           <div className="flex justify-between items-center gap-2 mb-1">
                              <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">{step.label}</h4>
                              {!isSolutionOnly && (
                                <span className="shrink-0 text-[10px] font-bold tabular-nums text-[var(--text-secondary)]">
                                  {step.pointsAchieved} / {step.maxPoints}
                                </span>
                              )}
                           </div>
                           <div className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">
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
                 </div>
              </div>

              {(() => {
                const structuredMethods = normalizeAlternativeMethods(sub.alternative_methods);
                const altList = normalizeAlternativeSolutions(sub.alternative_solutions);
                if (structuredMethods.length === 0 && altList.length === 0) return null;
                return (
                  <div className="mt-8 p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/20 relative z-10 w-full min-w-0">
                    <h5 className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      一題多解 (Alternative Approach)
                    </h5>
                    <div className="text-[var(--text-primary)] text-sm leading-relaxed min-w-0">
                      {structuredMethods.length > 0 ? (
                        <AlternativeMethodsAccordion methods={structuredMethods} keyPrefix={stemRowKey} />
                      ) : (
                        renderAlternativeSolutions(altList, stemRowKey)
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {!isSolutionOnly &&
                ((Array.isArray(sub.student_input_parsing?.segments) &&
                  (sub.student_input_parsing?.segments?.length ?? 0) > 0) ||
                  (Array.isArray(sub.annotations) && sub.annotations.length > 0) ||
                  originalText) && (
                  <div className="mt-8 relative z-10">
                    <InteractiveMathText
                      fullText={originalText || ''}
                      annotations={sub.annotations}
                      segments={sub.student_input_parsing?.segments}
                    />
                  </div>
                )}
              
              {(() => {
                const subLabel = sub.sub_id?.trim() || `第 ${idx + 1} 小題`;
                const questionFigureTitle = `題目圖形（${subLabel}）`;
                const rawVcInput = sub.visualization_code;
                let rawVc: unknown = rawVcInput;
                if (typeof rawVcInput === 'string' && rawVcInput.trim()) {
                  try {
                    const cleaned = rawVcInput
                      .trim()
                      .replace(/^```(?:json)?\s*/i, '')
                      .replace(/\s*```$/i, '')
                      .trim();
                    const parsedVc = JSON.parse(cleaned) as unknown;
                    if (parsedVc && typeof parsedVc === 'object' && !Array.isArray(parsedVc)) {
                      rawVc = parsedVc;
                    }
                  } catch {
                    rawVc = rawVcInput.trim();
                  }
                }
                const rawVcObj =
                  rawVc != null && typeof rawVc === 'object' && !Array.isArray(rawVc)
                    ? (rawVc as { explanation?: string; visualizations?: unknown[] })
                    : null;
                const rawItems = Array.isArray(rawVcObj?.visualizations) ? rawVcObj.visualizations : [];
                let renderableFromModel: unknown[] = [];
                try {
                  renderableFromModel = filterRenderableVisualizations(rawItems);
                } catch {
                  renderableFromModel = [];
                }
                /** 與 GradingWorkflow GEOMETRY_PREFETCH_SUBJECT_IDS 對齊：數學甲與分科物理皆有題幹幾何預抓 */
                const stemUsesQuestionGeometry =
                  stemSubjectBase === 'math' || stemSubjectBase === 'physics';
                const prefetchOk =
                  stemUsesQuestionGeometry &&
                  prefetchedQuestionGeometry != null &&
                  geometryJsonItemRenderable({
                    type: 'geometry_json',
                    code: prefetchedQuestionGeometry,
                  });
                /**
                 * 題幹預抓幾何後備：數學維持「多列題組僅首列」避免同一母題圖洗版；
                 * 分科物理依 SUB-QUESTION VISUALIZATION MANDATE — 每子題皆應有視覺化，故每列皆可掛題幹示意圖。
                 */
                const prefetchFallbackThisSub =
                  prefetchOk &&
                  (stemSubjectBase === 'physics' || rows.length <= 1 || idx === 0);

                let visualizationContent: typeof rawVc | {
                  explanation: string;
                  visualizations: Array<{
                    type: 'geometry_json';
                    title: string;
                    code: NonNullable<typeof prefetchedQuestionGeometry>;
                  }>;
                } | null = null;

                if (prefetchFallbackThisSub && renderableFromModel.length === 0) {
                  const explanation =
                    typeof rawVcObj?.explanation === 'string' && rawVcObj.explanation.trim()
                      ? rawVcObj.explanation.trim()
                      : `【${subLabel}】以下為依題幹圖像萃取之示意圖，供對照題意與幾何條件。`;
                  const geoViz = {
                    type: 'geometry_json' as const,
                    title: questionFigureTitle,
                    code: prefetchedQuestionGeometry,
                  };
                  /** 保留模型原始 visualizations，供 VisualizationRenderer lenient 再嘗試（例如 plotly 形狀邊界） */
                  visualizationContent = {
                    explanation,
                    visualizations:
                      rawItems.length > 0 ? [geoViz, ...rawItems] : [geoViz],
                  };
                } else if (rawVcObj != null) {
                  const hasModelGeometry = renderableFromModel.some(
                    (it) => (it as { type?: string }).type === 'geometry_json',
                  );
                  if (
                    prefetchFallbackThisSub &&
                    stemUsesQuestionGeometry &&
                    renderableFromModel.length > 0 &&
                    !hasModelGeometry
                  ) {
                    const exModel =
                      typeof rawVcObj.explanation === 'string' ? rawVcObj.explanation.trim() : '';
                    visualizationContent = {
                      explanation: [
                        exModel,
                        `【題目圖形｜${subLabel}】以下為依題幹影像預先萃取之示意圖，與解題用圖表併列對照。`,
                      ]
                        .filter(Boolean)
                        .join('\n'),
                      visualizations: [
                        {
                          type: 'geometry_json',
                          title: questionFigureTitle,
                          code: prefetchedQuestionGeometry!,
                        },
                        ...rawItems,
                      ],
                    };
                  } else {
                    visualizationContent = rawVcObj;
                  }
                } else if (typeof rawVc === 'string' && rawVc.trim()) {
                  visualizationContent = rawVc.trim();
                } else if (prefetchFallbackThisSub) {
                  visualizationContent = {
                    explanation: `【${subLabel}】以下為依題幹圖像萃取之示意圖，供對照題意與幾何條件。`,
                    visualizations: [
                      {
                        type: 'geometry_json',
                        title: questionFigureTitle,
                        code: prefetchedQuestionGeometry,
                      },
                    ],
                  };
                }

                if (!visualizationContent) return null;
                const vc: unknown = visualizationContent;
                const chem = subjectName.includes('化學') || subjectName.includes('Chemistry');
                const rootMol3dOk =
                  chem &&
                  (typeof vc === 'string'
                    ? /^\d+$/.test(String(vc).trim())
                    : vc != null &&
                      typeof vc === 'object' &&
                      (() => {
                        const o = vc as Record<string, unknown>;
                        if (o.cid != null && String(o.cid).trim() !== '') return true;
                        if (typeof o.smiles === 'string' && o.smiles.trim()) return true;
                        if (typeof o.pdb === 'string' && o.pdb.trim()) return true;
                        if (typeof o.mol === 'string' && o.mol.trim()) return true;
                        const en =
                          typeof o.english_name === 'string' ? o.english_name.trim() : '';
                        if (en && /^[\x20-\x7E]+$/.test(en)) return true;
                        return false;
                      })());
                return rootMol3dOk ? (
                   <div className="mt-8 relative z-10 bg-[var(--bg-main)] p-6 rounded-[2rem] border border-[var(--border-color)] transition-colors">
                     <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       3D 分子結構 (3D Molecular Model)
                     </h5>
                     <Viewer3D
                       cid={typeof vc === 'string' ? vc.trim() : (vc as { cid?: string | number }).cid}
                       smiles={typeof vc === 'object' && vc ? (vc as { smiles?: string }).smiles : undefined}
                       pdb={typeof vc === 'object' && vc ? (vc as { pdb?: string }).pdb : undefined}
                       mol={typeof vc === 'object' && vc ? (vc as { mol?: string }).mol : undefined}
                       englishName={
                         typeof vc === 'object' && vc
                           ? (vc as { english_name?: string }).english_name
                           : undefined
                       }
                     />
                   </div>
                 ) : (
                   <div className="relative z-[1] isolate">
                     <VisualizationRenderer
                       content={vc}
                       prefetchedGeometryJson={prefetchedQuestionGeometry}
                       onRetryExtraction={onRetryQuestionGeometryExtraction}
                       allowPrefetchedGeometryFallback={
                         stemUsesQuestionGeometry &&
                         (stemSubjectBase === 'physics' || rows.length <= 1 || idx === 0)
                       }
                       prefetchedGeometryVizTitle={
                         stemUsesQuestionGeometry
                           ? `題目圖形（${sub.sub_id?.trim() || `第 ${idx + 1} 小題`}）`
                           : undefined
                       }
                     />
                   </div>
                 );
              })()}

              {zeroCompressionHasContent(sub.zero_compression) && sub.zero_compression ? (
                <ZeroCompressionBlocks steps={sub.zero_compression} isSolutionOnly={isSolutionOnly} />
              ) : null}

              {sub.correct_calculation &&
                (!zeroCompressionHasContent(sub.zero_compression) ||
                  isAstMathA ||
                  isBiologyStem) && (
                 <div className="mt-8 relative z-[5] bg-[var(--bg-main)] p-6 rounded-[2rem] border border-[var(--border-color)] transition-colors">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                       {isSolutionOnly ? '標準演算流程 (Standard Derivation)' : '參考詳解 (Reference Solution)'}
                    </h5>
                    <div className="font-serif text-[var(--text-primary)] text-base leading-loose">
                       <LatexRenderer content={sub.correct_calculation} />
                    </div>
                 </div>
              )}

              <CeecAnswerSheetFooter
                spec={sub.ceec_answer_sheet ?? undefined}
                subId={sub.sub_id}
                exampleFormatHint={buildCeecExampleFormatHint(sub, isAstMathA || isBiologyStem)}
              />
              <MicroLessonBlock lesson={sub.micro_lesson} />
            </div>
          );
        } catch (error) {
          console.error('[Grading Fatal Error]', error, '\nPayload:', sub);
          return <div key={`${stemRowKey}-${idx}`} className="p-4 bg-red-500/10 text-red-500 border border-red-500 rounded-xl my-4">圖表或步驟渲染失敗，請重試或回報。</div>;
        }
      })}
    </div>
  );
};

export { AstMathAStrategy };
