import React from 'react';
import { Star } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { 
  GradingResults, 
  ChineseWritingResults,
  DetailedFix,
  LinguisticAudit,
  SubjectExpertAnalysis,
} from '../types';
import { AstMathAStrategy } from './strategies/AstMathAStrategy';
import LatexRenderer from './LatexRenderer';
import { SmilesRenderer } from './SmilesRenderer';
import { Viewer3D } from './Viewer3D';
import { MasterpieceCard, ParagraphCard, PolishedSentenceCard, StructureCard } from './chinese/PolishedSentenceCard';
import { InteractiveChineseArticle } from './chinese/InteractiveChineseArticle';
import { InteractiveArticle } from './common/InteractiveArticle';
import type { GeometryJSON } from '@/src/types/geometry';
import { getStemSubAchievedPoints } from '../utils/mathScoringUtils';

interface Props {
  results: GradingResults | ChineseWritingResults;
  /** 題目圖預萃取幾何（數學／物理），供 VisualizationRenderer 後備 */
  prefetchedQuestionGeometry?: GeometryJSON | null;
  /** 重新呼叫 /api/extract-geometry（第一張題目圖） */
  onRetryQuestionGeometryExtraction?: () => void;
}

const TextWithChemistry: React.FC<{ content: string; className?: string; isInline?: boolean }> = ({ content, className, isInline }) => {
  if (!content) return null;
  const safeContent = typeof content === 'string' ? content : String(content);
  const parts = safeContent.split(/(<smiles>.*?<\/smiles>|<mol3d\s+cid=".*?"\s*\/>|<mol3d>.*?<\/mol3d>)/g);
  
  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (part.startsWith('<smiles>') && part.endsWith('</smiles>')) {
          const smiles = part.slice(8, -9);
          return <SmilesRenderer key={idx} smiles={smiles} className="my-4" />;
        }
        if (part.startsWith('<mol3d') && part.endsWith('/>')) {
          const match = part.match(/cid="([^"]+)"/);
          const cid = match ? match[1] : '';
          return <Viewer3D key={idx} cid={cid} />;
        }
        if (part.startsWith('<mol3d>') && part.endsWith('</mol3d>')) {
          const cid = part.slice(7, -8);
          return <Viewer3D key={idx} cid={cid} />;
        }
        return <LatexRenderer key={idx} content={part} isInline={isInline} className={className} />;
      })}
    </>
  );
};

const HighlightedArticle: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const safeContent = typeof content === 'string' ? content : String(content);
  const paragraphs = safeContent.split(/\n+/);
  return (
    <div className="text-base tracking-wide font-serif text-[var(--text-primary)] transition-colors duration-300">
      {paragraphs.map((para, i) => {
         if (!para.trim()) return null;
         const parts = para.split(/(\*\*.*?\*\*|<smiles>.*?<\/smiles>|<mol3d\s+cid=".*?"\s*\/>|<mol3d>.*?<\/mol3d>)/g);
         return (
           <div key={i} className="mb-6 last:mb-0 leading-loose break-words">
             {parts.map((part, idx) => {
               if (!part) return null;
               if (part.startsWith('**') && part.endsWith('**')) {
                 const text = part.slice(2, -2);
                 return (
                   <span key={idx} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1 rounded-sm border-b-2 border-emerald-500/50 mx-0.5 inline-block align-baseline transition-colors duration-300">
                     <LatexRenderer content={text} isInline={true} className="!text-inherit" />
                   </span>
                 );
               }
               if (part.startsWith('<smiles>') && part.endsWith('</smiles>')) {
                 const smiles = part.slice(8, -9);
                 return <SmilesRenderer key={idx} smiles={smiles} className="my-4" />;
               }
               if (part.startsWith('<mol3d') && part.endsWith('/>')) {
                 const match = part.match(/cid="([^"]+)"/);
                 const cid = match ? match[1] : '';
                 return <Viewer3D key={idx} cid={cid} />;
               }
               if (part.startsWith('<mol3d>') && part.endsWith('</mol3d>')) {
                 const cid = part.slice(7, -8);
                 return <Viewer3D key={idx} cid={cid} />;
               }
               return <LatexRenderer key={idx} content={part} isInline={true} className="inline" />;
             })}
           </div>
         );
      })}
    </div>
  );
};

/** 與 project-2 主席卡風格一致：獨立卡片、左色條區塊，承接 Phase 1／2 明細 */
const PhaseFollowUpAudit: React.FC<{ phase1: LinguisticAudit; phase2: SubjectExpertAnalysis }> = ({
  phase1,
  phase2,
}) => (
  <div className="bg-[var(--bg-card)] rounded-[1.5rem] shadow-2xl overflow-hidden border border-[var(--border-color)] ring-1 ring-white/5 transition-colors duration-300">
    <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
      <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
        前置雙階審核（Phase 1 → 2）
      </h3>
    </div>
    <div className="p-6 space-y-6">
      <div className="p-5 bg-[var(--bg-main)] rounded-xl border-l-4 border-cyan-500 shadow-xl transition-colors duration-300">
        <h4 className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.2em] mb-3">
          Phase 1 · 語言與形式審核
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
            <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-wider block mb-1">技術分數</span>
            <span className="text-lg font-black text-[var(--text-primary)]">{phase1.technical_proficiency_score ?? '—'}</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
            <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-wider block mb-1">字數</span>
            <span className="text-lg font-black text-[var(--text-primary)]">{phase1.word_count ?? '—'}</span>
          </div>
        </div>
        <h6 className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">基礎語法檢查</h6>
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] leading-relaxed mb-4">
          <TextWithChemistry content={phase1.basic_syntax_check || '—'} className="inline" />
        </div>
        <h6 className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">文法與用語觀察</h6>
        {phase1.grammatical_observations?.length ? (
          <ul className="space-y-2">
            {phase1.grammatical_observations.map((obs, i) => (
              <li
                key={i}
                className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] leading-relaxed flex gap-2"
              >
                <span className="shrink-0 font-black text-cyan-600 dark:text-cyan-400 text-xs">{i + 1}.</span>
                <TextWithChemistry content={obs} className="inline" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-secondary)] italic">此階段無額外條列觀察。</p>
        )}
      </div>

      <div className="p-5 bg-[var(--bg-main)] rounded-xl border-l-4 border-violet-500 shadow-xl transition-colors duration-300">
        <h4 className="text-[8px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-[0.2em] mb-3">
          Phase 2 · 學科專家分析
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
            <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-wider block mb-1">質性得分</span>
            <span className="text-lg font-black text-[var(--text-primary)]">{phase2.qualitative_merit_score ?? '—'}</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] sm:col-span-2">
            <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-wider block mb-1">思辨層級</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{phase2.critical_thinking_level || '—'}</span>
          </div>
        </div>
        <h6 className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">推理與內容深評</h6>
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] leading-relaxed">
          <TextWithChemistry content={phase2.reasoning_critique || '—'} className="inline" />
        </div>
      </div>
    </div>
  </div>
);



const ChineseResultsDisplay: React.FC<{ results: ChineseWritingResults }> = ({ results }) => {
  const { toggleFavorite, isFavorited } = useFavorites();
  
  // 與 project-2 相同：動態產生收藏用 ID
  const resultId = (results as any).id || (results as any).timestamp?.toString() || JSON.stringify(results).substring(0, 50);
  const isFav = isFavorited(resultId);

  const handleToggleFavorite = () => {
    const realScore = (results as any).overallScore || (results as any).totalScore || (results as any).score || '';
    toggleFavorite({
      id: resultId,
      subject: (results as any).subject || '國寫批改結果',
      date: new Date().toLocaleDateString(),
      snippet: realScore ? `得分：${realScore} 分` : '點擊查看完整批改解析',
      data: results
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-full">
      <div className="bg-[var(--bg-card)] rounded-[1.5rem] shadow-2xl overflow-hidden border border-[var(--border-color)] ring-1 ring-white/5 transition-colors duration-300">
        <div className="bg-gradient-to-br from-indigo-600/80 to-purple-900/90 p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10">
           <div className="text-center md:text-left space-y-1 min-w-0">
             <h2 className="text-lg font-black tracking-tight uppercase flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <span className="w-4 h-0.5 bg-white/40 rounded-full hidden md:block"></span>
                {results.isSolutionOnly ? '國寫標準範文' : '國寫閱卷報告'}
             </h2>
             <p className="text-white/70 text-sm font-medium break-words">
                {results.isSolutionOnly ? '針對題目生成的標準範文與解析。' : '針對學生作答的深度評析與建議。'}
             </p>
           </div>
           <div className="flex items-center gap-4 flex-shrink-0">
             <button 
               onClick={handleToggleFavorite}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-sm ${
                 isFav 
                   ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                   : 'bg-white/10 text-white hover:text-amber-300 border border-white/20'
               }`}
             >
               <Star className={`w-5 h-5 transition-transform ${isFav ? 'fill-current scale-110' : 'scale-100'}`} />
               {isFav ? '已收藏' : '收藏此題'}
             </button>
           </div>
        </div>
        <div className="p-6">
           <div className="p-5 bg-[var(--bg-main)] rounded-xl border-l-4 border-indigo-500 shadow-xl transition-colors duration-300">
              <h4 className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">總評 (OVERALL REMARKS)</h4>
              <div className="text-[var(--text-primary)] font-bold text-sm italic leading-relaxed pl-1 break-words">
                 <TextWithChemistry content={results.overall_remarks || "無總評"} className="inline" />
              </div>
           </div>
        </div>
      </div>

      {results.sections.map((section, idx) => (
        <div key={idx} className="space-y-6">
           <div className="flex flex-wrap items-center gap-4 px-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] font-black shadow-inner flex-shrink-0 transition-colors duration-300">
                 {idx + 1}
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)] break-words min-w-0">{section.section_title}</h3>
              <div className="ml-auto flex items-baseline gap-1 flex-shrink-0">
                 <span className="text-2xl font-black text-indigo-500 dark:text-indigo-400">{section.total_section_score}</span>
                 <span className="text-sm text-[var(--text-secondary)] font-bold">分</span>
              </div>
           </div>

           {section.sub_results.map((sub, sIdx) => (
             <div key={sIdx} className="bg-[var(--bg-card)] rounded-[2rem] p-8 border border-[var(--border-color)] shadow-xl relative overflow-hidden group transition-colors duration-300">
                <div className="flex justify-between items-start mb-6 relative z-10 border-b border-[var(--border-color)] pb-4">
                   <div>
                      <h4 className="text-[var(--text-primary)] font-bold text-lg mb-1">{sub.sub_id}</h4>
                      <p className="text-[var(--text-secondary)] text-xs font-bold">得分: <span className="text-[var(--text-primary)]">{sub.score}</span> / {sub.max_points}</p>
                   </div>
                </div>

                {sub.revision_suite?.topic_relevance && (
                   <div className="mb-8 relative z-10 bg-pink-500/10 p-6 rounded-2xl border border-pink-500/20">
                      <h5 className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                         扣題分析 (Topic Relevance)
                      </h5>
                      <div className="text-pink-700 dark:text-pink-200 text-sm leading-relaxed font-medium">
                         <TextWithChemistry content={sub.revision_suite.topic_relevance} />
                      </div>
                   </div>
                )}

                <div className="mb-8 relative z-10">
                   <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">評語</h5>
                   <div className="p-5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] transition-colors duration-300">
                      <div className="text-[var(--text-primary)] text-sm leading-relaxed"><TextWithChemistry content={sub.feedback} /></div>
                   </div>
                </div>

                {!results.isSolutionOnly && sub.student_response && sub.revision_suite?.annotations && (
                   <div className="mb-8 relative z-10">
                      <InteractiveChineseArticle fullText={sub.student_response} annotations={sub.revision_suite.annotations} />
                   </div>
                )}

                <div className="space-y-8 relative z-10">
                   {sub.revision_suite?.polished_sentences && Array.isArray(sub.revision_suite.polished_sentences) && sub.revision_suite.polished_sentences.length > 0 && (
                      <div className="space-y-4">
                         <h5 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            精修例句 (Refinement)
                         </h5>
                         <div className="grid grid-cols-1 gap-4">
                            {sub.revision_suite.polished_sentences.map((sent, i) => (
                               <PolishedSentenceCard key={i} item={sent} />
                            ))}
                         </div>
                      </div>
                   )}

                   {sub.revision_suite?.paragraph_diagnostics && Array.isArray(sub.revision_suite.paragraph_diagnostics) && sub.revision_suite.paragraph_diagnostics.length > 0 && (
                      <div className="space-y-4">
                         <h5 className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            段落診斷 (Structure)
                         </h5>
                         <div className="grid grid-cols-1 gap-4">
                            {sub.revision_suite.paragraph_diagnostics.map((para, i) => (
                               <ParagraphCard key={i} item={para} />
                            ))}
                         </div>
                      </div>
                   )}

                   {sub.revision_suite?.masterpiece_alignment && (
                      <MasterpieceCard data={sub.revision_suite.masterpiece_alignment} />
                   )}

                   {(sub.revision_suite?.optimized_rewrite || (sub as any).model_essay) && (
                      <div className="bg-[var(--bg-card)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-xl relative overflow-hidden transition-colors duration-300">
                         <h3 className="text-emerald-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2 mb-6">
                           <span className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">✎</span>
                           {results.isSolutionOnly ? '參考範文' : '升級改寫'}
                         </h3>
                         <div className="relative z-10 font-serif text-lg leading-loose text-[var(--text-primary)] tracking-wide">
                            <HighlightedArticle content={sub.revision_suite?.optimized_rewrite || (sub as any).model_essay} />
                         </div>
                      </div>
                   )}

                   {sub.revision_suite?.overall_suggestions && Array.isArray(sub.revision_suite.overall_suggestions) && sub.revision_suite.overall_suggestions.length > 0 && (
                      <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10">
                         <h3 className="text-blue-500 dark:text-blue-400 font-black text-sm uppercase tracking-tighter mb-4">🚀 改進建議 (Suggestions)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sub.revision_suite.overall_suggestions.map((sugg, i) => (
                               <div key={i} className="flex gap-2 items-start">
                                  <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-[10px]">{i+1}</div>
                                  <div>
                                     <h6 className="text-[var(--text-primary)] font-bold text-xs mb-1">{sugg.title}</h6>
                                     <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{sugg.content}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             </div>
           ))}
        </div>
      ))}
    </div>
  );
};

const ResultsDisplay: React.FC<Props> = ({
  results,
  prefetchedQuestionGeometry,
  onRetryQuestionGeometryExtraction,
}) => {
  const { toggleFavorite, isFavorited } = useFavorites();

  if ('sections' in results) {
     return <ChineseResultsDisplay results={results as ChineseWritingResults} />;
  }

  const { phase1, phase2, phase3, subjectName: rawSubjectName, isSolutionOnly } = results as GradingResults;
  const subjectName = rawSubjectName || '';
  const resultId = (results as any).id || (results as any).timestamp?.toString() || JSON.stringify(results).substring(0, 50);
  const isFav = isFavorited(resultId);

  let totalScore: number | undefined = phase3?.final_score;
  let calculatedMaxScore = 0;

  if (phase3?.stem_sub_results && phase3.stem_sub_results.length > 0) {
      totalScore = phase3.stem_sub_results.reduce(
        (acc, sub) => acc + getStemSubAchievedPoints(sub, subjectName),
        0
      );
      calculatedMaxScore = phase3.stem_sub_results.reduce((acc, sub) => acc + (Number(sub.max_points) || 0), 0);
  } else if (totalScore === undefined || totalScore === null) {
      totalScore = phase3?.ceec_results?.total_score || 0;
  }

  totalScore = Number(totalScore);
  if (isNaN(totalScore)) totalScore = 0;
  const maxScore = calculatedMaxScore > 0 ? calculatedMaxScore : (Number(phase3?.max_score) || 20);

  const handleToggleFavorite = () => {
    const realScore = totalScore;
    toggleFavorite({
      id: resultId,
      subject: subjectName || 'AI 批改結果',
      date: new Date().toLocaleDateString(),
      snippet: realScore !== undefined ? `得分：${Number.isInteger(realScore) ? realScore : realScore.toFixed(1)} / ${maxScore} 分` : '點擊查看完整批改解析',
      data: results
    });
  };

  /** 寫作類科目：英文作文、國文／國寫、華文等（與國寫卷「國語文寫作能力測驗」等命名對齊） */
  const isWritingComposition = [
    '英文',
    'English',
    '作文',
    '國文',
    '國語',
    '寫作',
    'Chinese',
    '華文',
  ].some((k) => subjectName.includes(k));
  const isStem = ['數學', '數甲', '數A', '數B', '物理', '化學', '生物', 'Calculus', 'Math', 'Science'].some(k => subjectName.includes(k));

  const getRank = (score: number, max: number) => {
    const ratio = max > 0 ? score / max : 0;
    if (ratio >= 0.85) return { label: 'A+', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10' };
    if (ratio >= 0.76) return { label: 'A', color: 'text-emerald-600 dark:text-emerald-500', bg: 'bg-emerald-600/10' };
    if (ratio >= 0.70) return { label: 'A-', color: 'text-emerald-600 dark:text-emerald-600', bg: 'bg-emerald-600/10' };
    if (ratio >= 0.60) return { label: 'B+', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-400/10' };
    if (ratio >= 0.52) return { label: 'B', color: 'text-amber-600 dark:text-amber-500', bg: 'bg-amber-500/10' };
    if (ratio >= 0.45) return { label: 'B-', color: 'text-amber-600 dark:text-amber-600', bg: 'bg-amber-600/10' };
    return { label: 'C', color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const rank = getRank(totalScore, maxScore);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-full">
      <div className="bg-[var(--bg-card)] rounded-[1.5rem] shadow-2xl overflow-hidden border border-[var(--border-color)] ring-1 ring-white/5 transition-colors duration-300">
        <div className="bg-gradient-to-br from-blue-600/80 to-indigo-900/90 p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10">
          <div className="text-center md:text-left space-y-1 min-w-0">
            <h2 className="text-lg font-black tracking-tight uppercase flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="w-4 h-0.5 bg-white/40 rounded-full hidden md:block"></span>
              {isSolutionOnly ? '標準詳解與範文' : '閱卷主席評分報告'}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <p className="text-white/70 text-sm font-medium break-words">
                {isSolutionOnly ? `針對「${subjectName}」的標準解答與觀念解析。` : `遵循 CEEC 標準對「${subjectName}」進行深度仲裁。`}
              </p>
              {!isSolutionOnly && (
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black border border-current shadow-lg backdrop-blur-md flex-shrink-0 ${rank.bg} ${rank.color}`}>
                  等第：{rank.label}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button 
              onClick={handleToggleFavorite}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-sm ${
                isFav 
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                  : 'bg-white/10 text-white hover:text-amber-300 border border-white/20'
              }`}
            >
              <Star className={`w-5 h-5 transition-transform ${isFav ? 'fill-current scale-110' : 'scale-100'}`} />
              {isFav ? '已收藏' : '收藏此題'}
            </button>
            {!isSolutionOnly && (
              <div className="flex flex-col items-center group flex-shrink-0">
                <div className="flex items-baseline">
                  <span className="text-5xl font-black text-blue-300 dark:text-blue-400 tracking-tighter drop-shadow-xl">
                    {Number.isInteger(totalScore) ? totalScore : totalScore.toFixed(1)}
                  </span>
                  <span className="text-xl text-white/50 font-bold ml-1 opacity-70">
                    /{maxScore}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="p-5 bg-[var(--bg-main)] rounded-xl border-l-4 border-blue-500 shadow-xl transition-colors duration-300">
              <h4 className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                {isSolutionOnly ? '題旨與考點分析 (KEY CONCEPTS)' : '主席分析 (REMARKS)'}
              </h4>
              <div className="text-[var(--text-primary)] font-bold text-sm italic leading-relaxed pl-1 break-words">
                <TextWithChemistry content={phase3?.remarks_zh || '綜整中...'} className="inline" />
              </div>
            </div>
            
            {(!isStem && !isSolutionOnly) && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(phase3?.ceec_results?.breakdown || {}).map(([key, val]) => (
                  <div key={key} className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] hover:border-blue-500/30 transition-colors duration-300 group">
                    <span className="text-[var(--text-secondary)] text-[8px] font-black uppercase tracking-[0.1em] block mb-0.5">{key}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-[var(--text-primary)]">{Number(val)}</span>
                      <span className="text-xs text-[var(--text-secondary)] font-bold ml-1">/ 5</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSolutionOnly && isWritingComposition && phase3 && (
         <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-xl space-y-4 transition-colors duration-300">
            <h3 className="text-red-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2">
               <span className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">🔍</span>
               原文轉錄與點評 (Interactive Diagnosis)
            </h3>
            <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2">
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500"></span> 錯誤 (點擊查看)</span>
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/20 border border-amber-500"></span> 建議優化</span>
            </div>
            <InteractiveArticle 
               fullText={results.originalContent || "請在批改時輸入文字以啟用互動檢視。"} 
               fixes={phase3.detailed_fixes}
               className="font-sans bg-[var(--bg-card)] p-6 rounded-xl shadow-inner border border-[var(--border-color)] text-lg leading-loose text-[var(--text-primary)] tracking-wide"
            />
         </div>
      )}

      {isWritingComposition && phase3?.masterpiece_alignment && (
        <div className="grid grid-cols-1 gap-6">
           <MasterpieceCard data={phase3.masterpiece_alignment} />
        </div>
      )}

      {!isSolutionOnly && isWritingComposition && phase3?.topic_relevance_analysis && (
        <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-xl space-y-4 transition-colors duration-300">
          <h3 className="text-pink-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2">
            <span className="w-6 h-6 bg-pink-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">🎯</span>
            扣題分析 (TOPIC RELEVANCE)
          </h3>
          <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm leading-relaxed border-l-2 border-l-pink-500 break-words transition-colors duration-300">
             <TextWithChemistry content={phase3.topic_relevance_analysis} />
          </div>
        </div>
      )}

      {!isSolutionOnly && isWritingComposition && phase3?.structure_check && (
        <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-xl space-y-4 transition-colors duration-300">
          <h3 className="text-purple-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">🏗️</span>
            段落細節診斷 (PARAGRAPH DIAGNOSIS)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StructureCard title="引言 (Introduction)" content={phase3.structure_check.introduction} />
              <StructureCard title="主旨句 (Thesis Statement)" content={phase3.structure_check.thesis_statement} />
              <StructureCard title="正文段落 (Body Paragraphs)" content={phase3.structure_check.body_paragraphs} className="md:col-span-2" />
              <StructureCard title="結論 (Conclusion)" content={phase3.structure_check.conclusion} />
              <StructureCard title="邏輯連貫性 (Logical Flow)" content={phase3.structure_check.logical_flow} />
          </div>
        </div>
      )}

      {phase3?.corrected_article && (
        <div className="bg-[var(--bg-card)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-xl relative overflow-hidden group transition-colors duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-32 h-32 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <h3 className="text-emerald-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2 mb-6 relative z-10">
            <span className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">✎</span>
            高分示範
          </h3>
          <div className="relative z-10 bg-[var(--bg-main)] p-6 rounded-2xl border border-[var(--border-color)] shadow-inner transition-colors duration-300">
             <HighlightedArticle content={phase3.corrected_article} />
          </div>
        </div>
      )}

      {!isSolutionOnly && phase3?.vocabulary_upgrades && Array.isArray(phase3.vocabulary_upgrades) && phase3.vocabulary_upgrades.length > 0 && (
        <div className="space-y-4">
           <h3 className="text-amber-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2">
             <span className="w-6 h-6 bg-amber-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">⚡</span>
             單字智能升級 (Vocabulary Upgrade)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phase3.vocabulary_upgrades.map((item, idx) => (
                <div key={idx} className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-color)] shadow-lg group hover:border-amber-500/30 transition-colors duration-300 animate-in zoom-in-50" style={{ animationDelay: `${idx * 100}ms` }}>
                   <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-0.5 bg-[var(--bg-main)] text-[var(--text-secondary)] text-[9px] font-black rounded-full border border-[var(--border-color)] uppercase tracking-widest">{item.level}</span>
                   </div>
                   <div className="flex items-center gap-3 mb-3">
                      <span className="text-[var(--text-secondary)] line-through decoration-[var(--border-color)] text-sm font-medium break-all">{item.original}</span>
                      <svg className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      <span className="text-amber-600 dark:text-amber-400 font-black text-lg break-all">{item.advanced}</span>
                   </div>
                   <div className="p-2.5 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs italic leading-tight break-words">"{item.example}"</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {isStem && phase3?.stem_sub_results && Array.isArray(phase3.stem_sub_results) && phase3.stem_sub_results.length > 0 ? (
        <>
          <AstMathAStrategy 
            data={phase3.stem_sub_results} 
            subjectName={subjectName} 
            originalText={results.originalContent}
            isSolutionOnly={isSolutionOnly}
            prefetchedQuestionGeometry={prefetchedQuestionGeometry}
            onRetryQuestionGeometryExtraction={onRetryQuestionGeometryExtraction}
          />
          
          {/* Added Science Detailed Fields — 同 project-2 */}
          {phase3.stem_sub_results.some(sub => sub.internal_verification || sub.scientific_notation_and_units) && (
            <div className="space-y-6 mt-8">
              {phase3.stem_sub_results.map((sub, idx) => {
                if (!sub.internal_verification && !sub.scientific_notation_and_units) return null;
                return (
                  <div key={`science-details-${idx}`} className="space-y-6">
                    {sub.internal_verification && (
                      <div className="bg-slate-500/5 dark:bg-slate-400/5 p-6 rounded-[2rem] border border-slate-500/20 shadow-lg">
                        <h3 className="text-slate-600 dark:text-slate-400 font-black text-sm uppercase tracking-tighter flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 bg-slate-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">🔍</span>
                          內部邏輯驗證 (AI Verification) {sub.sub_id ? `- ${sub.sub_id}` : ''}
                        </h3>
                        <div className="text-[var(--text-primary)] text-sm leading-relaxed">
                          <TextWithChemistry content={sub.internal_verification} />
                        </div>
                      </div>
                    )}
                    {sub.scientific_notation_and_units && (
                      <div className="bg-yellow-500/5 dark:bg-yellow-400/5 p-6 rounded-[2rem] border border-yellow-500/20 shadow-lg">
                        <h3 className="text-yellow-600 dark:text-yellow-500 font-black text-sm uppercase tracking-tighter flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 bg-yellow-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg">📏</span>
                          單位與格式檢核 (Units & Format) {sub.sub_id ? `- ${sub.sub_id}` : ''}
                        </h3>
                        <div className="text-[var(--text-primary)] text-sm leading-relaxed">
                          <TextWithChemistry content={sub.scientific_notation_and_units} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {phase3?.growth_roadmap && Array.isArray(phase3.growth_roadmap) && phase3.growth_roadmap.length > 0 && (
        <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h3 className="text-blue-500 dark:text-blue-400 font-black text-sm uppercase tracking-tighter">🚀 {isSolutionOnly ? '重點總結 (SUMMARY)' : '寫作改進建議 (IMPROVEMENT SUGGESTIONS)'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {phase3.growth_roadmap.map((step, i) => (
                <div key={i} className="flex gap-2 items-center group/step">
                  <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-[10px] shadow-xl">{i + 1}</div>
                  <div className="text-[var(--text-primary)] font-bold text-xs leading-snug break-words">
                    <TextWithChemistry content={step} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isSolutionOnly && phase1 && phase2 && (
        <PhaseFollowUpAudit phase1={phase1} phase2={phase2} />
      )}
    </div>
  );
};

export default ResultsDisplay;
