import React, { useState, useEffect } from 'react';
import { Subject, QuestionSet, ActivityType } from '../types';
import { useGrading } from '../hooks/useGrading';
import { useAppContext } from '@/contexts/AppContext';
import { AseaUploadField } from './common/AseaUploadField';
import { SubQuestionInputs } from './inputs/SubQuestionInputs';
import { ModelSelector, GradingModel } from './ModelSelector';
import ResultsDisplay from './ResultsDisplay';
import { PhaseStatus } from '../types';
import GradingLoadingState from './common/GradingLoadingState';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { startSubjectTour } from '../utils/tourConfig';

interface Props {
  subject: string; // The ID of the subject
}

// Helper to find subject object from ID
const getSubjectById = (id: string): Subject | undefined => {
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
  return [...gsatSubjects, ...astSubjects].find(s => s.id === id);
};

const Step: React.FC<{ 
  title: string; 
  description: string; 
  status: PhaseStatus; 
  model: string;
  icon: React.ReactNode;
}> = ({ title, description, status, model, icon }) => {
  const isLoading = status === PhaseStatus.LOADING;
  const isCompleted = status === PhaseStatus.COMPLETED;
  const isError = status === PhaseStatus.ERROR;

  let containerClasses = "relative flex items-center p-4 rounded-2xl border transition-all duration-700 ";
  let iconClasses = "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-500 shadow-inner ";
  let titleClasses = "font-black text-sm transition-colors duration-500 ";
  let badgeClasses = "text-[8px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ";

  if (isLoading) {
    containerClasses += "bg-blue-600/10 border-blue-500 shadow-2xl shadow-blue-500/20 scale-[1.01] z-10";
    iconClasses += "bg-blue-600 text-white animate-pulse";
    titleClasses += "text-blue-500";
    badgeClasses += "bg-blue-500 text-white border-blue-400";
  } else if (isCompleted) {
    containerClasses += "bg-emerald-600/5 border-emerald-500/40 dark:bg-emerald-900/10 dark:border-emerald-800/50";
    iconClasses += "bg-emerald-600 text-white";
    titleClasses += "text-emerald-500";
    badgeClasses += "bg-emerald-600 text-white border-emerald-500";
  } else if (isError) {
    containerClasses += "bg-red-500/10 border-red-500";
    iconClasses += "bg-red-600 text-white";
    titleClasses += "text-red-500";
    badgeClasses += "bg-red-600 text-white border-red-500";
  } else {
    containerClasses += "bg-zinc-100 dark:bg-[#202124] border-zinc-200 dark:border-zinc-800 opacity-60";
    iconClasses += "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";
    titleClasses += "text-zinc-400 dark:text-zinc-500";
    badgeClasses += "bg-zinc-400/20 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-600 border-zinc-300 dark:border-zinc-700";
  }

  return (
    <div className={containerClasses}>
      <div className={iconClasses}>
        {isLoading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : isCompleted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
          </svg>
        ) : icon}
      </div>
      <div className="ml-5 flex-grow">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className={titleClasses}>{title}</h3>
          <span className={badgeClasses}>{model}</span>
        </div>
        <p className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-0.5 font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

const DraftEditor: React.FC<{
  title: string;
  initialText: string;
  onSave: (text: string) => void;
}> = ({ title, initialText, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialText);

  React.useEffect(() => {
    setText(initialText);
  }, [initialText]);

  if (isEditing) {
    return (
      <div className="space-y-3 p-4 bg-[var(--bg-main)] dark:bg-[#1a1b1e] border border-blue-500/50 rounded-xl shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-blue-600 dark:text-blue-400">{title} (編輯模式)</label>
          <div className="flex items-center gap-2">
            <button onClick={() => { setText(initialText); setIsEditing(false); }} className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">取消</button>
            <button onClick={() => { onSave(text); setIsEditing(false); }} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm">儲存</button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 text-[var(--text-primary)] resize-none outline-none text-sm transition-colors duration-300 selection:bg-yellow-200 selection:text-black dark:selection:bg-yellow-500/40 dark:selection:text-yellow-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-[var(--bg-main)] dark:bg-[#1a1b1e] border border-[var(--border-color)] dark:border-zinc-800 rounded-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{title}</label>
        <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          編輯
        </button>
      </div>
      <div className="text-sm text-slate-800 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed selection:bg-yellow-200 selection:text-black dark:selection:bg-yellow-500/40 dark:selection:text-yellow-100">
        {initialText}
      </div>
    </div>
  );
};

export const GradingWorkflow: React.FC<Props> = ({ subject: subjectId }) => {
  const subject = getSubjectById(subjectId);
  const isChineseWriting = subject?.id === 'gsat-chinese';
  const { logActivity, customInstructions } = useAppContext();

  // State
  const initialQSet: QuestionSet = { q: [], r: [], s: [], text: '', mode: 'image' };
  const [chineseAnswers, setChineseAnswers] = useState<Record<string, QuestionSet>>({
    s1q1: { ...initialQSet },
    s1q2: { ...initialQSet },
    s2q1: { ...initialQSet },
    s2q2: { ...initialQSet },
  });
  const [questionImages, setQuestionImages] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [answerMode, setAnswerMode] = useState<'image' | 'text'>('image');
  const [gradingModel, setGradingModel] = useState<GradingModel>('standard');

  const [transcriptionDraft, setTranscriptionDraft] = useState<Record<string, string> | null>(null);
  const [standardDraft, setStandardDraft] = useState<{ qText: string, rText: string, sText: string } | null>(null);

  const hasUploaded = isChineseWriting 
    ? (chineseAnswers.s1q1.q.length > 0 || chineseAnswers.s1q1.r.length > 0 || chineseAnswers.s1q1.s.length > 0 || chineseAnswers.s1q1.text.length > 0 || transcriptionDraft !== null)
    : (studentImages.length > 0 || inputText.length > 0 || standardDraft !== null);

  useEffect(() => {
    if (!subjectId) return;
    const hasToured = localStorage.getItem(`tour_${subjectId}`);
    if (!hasToured) {
      const timer = setTimeout(() => {
        startSubjectTour(subjectId);
        localStorage.setItem(`tour_${subjectId}`, 'true');
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [subjectId]);

  const { 
    isGrading, gradingStatus, chineseResults, standardResults, 
    p1, p2, p3, setChineseResults, setStandardResults, resetState,
    handleGradeStandard, transcribeChineseOnly, gradeChineseFromText,
    transcribeStandardOnly, gradeStandardFromText
  } = useGrading();

  const updateChineseAnswer = (key: string, field: keyof QuestionSet, value: any) => {
    setChineseAnswers(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const onStandardTranscribe = async () => {
    if (!subject) return;
    const draft = await transcribeStandardOnly(questionImages, referenceImages, studentImages, inputText, answerMode);
    if (draft) {
      setStandardDraft(draft);
    }
  };

  const onStandardConfirmAndGrade = () => {
    if (!subject || !standardDraft) return;
    gradeStandardFromText(
      subject, standardDraft.qText, standardDraft.rText, standardDraft.sText, customInstructions, gradingModel, logActivity,
      () => {
        setStandardDraft(null);
        setQuestionImages([]);
        setReferenceImages([]);
        setStudentImages([]);
        setInputText('');
      }
    );
  };

  const onChineseTranscribe = async () => {
    const draft = await transcribeChineseOnly(chineseAnswers);
    if (draft) {
      setTranscriptionDraft(draft);
    }
  };

  const onChineseConfirmAndGrade = () => {
    if (!transcriptionDraft) return;
    gradeChineseFromText(
      chineseAnswers, transcriptionDraft, customInstructions, gradingModel, logActivity,
      () => {
        setTranscriptionDraft(null);
        setChineseAnswers({
          s1q1: { ...initialQSet }, s1q2: { ...initialQSet },
          s2q1: { ...initialQSet }, s2q2: { ...initialQSet }
        });
      }
    );
  };

  const handleReset = () => {
    resetState();
    setTranscriptionDraft(null);
    setStandardDraft(null);
  };

  const showResults = !!(chineseResults || standardResults);

  if (!subject) return <div>Subject not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight border-l-4 border-blue-600 pl-4 uppercase break-words min-w-0">{subject.name}</h1>
        {showResults && (
          <button onClick={handleReset} className="w-full md:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 font-black text-xs uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all flex-shrink-0">
            修改作答內容
          </button>
        )}
      </div>

      {!showResults &&
        !isGrading &&
        gradingStatus.trim() &&
        (p1 === PhaseStatus.ERROR || p2 === PhaseStatus.ERROR || p3 === PhaseStatus.ERROR) && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10"
          >
            {gradingStatus}
          </div>
        )}

      {!showResults && (
        <>
          {transcriptionDraft ? (
            <div id="preview-image" className="space-y-6 pb-32">
              <div className="p-4 md:p-6 bg-[var(--bg-card)] dark:bg-[#202124] rounded-[1.5rem] border border-slate-200 dark:border-zinc-900 shadow-xl relative overflow-hidden transition-colors duration-300">
                <h2 className="text-base font-black dark:text-white text-slate-900 mb-6 flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs text-white flex-shrink-0">校</span>
                  辨識結果確認 (人工校正)
                </h2>
                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-6 pr-2">
                  {Object.entries(transcriptionDraft).map(([key, text]) => {
                    if (!text) return null;
                    const titleMap: Record<string, string> = {
                      s1q1: '第一大題：知性題 (子題一)',
                      s1q2: '第一大題：知性題 (子題二)',
                      s2q1: '第二大題：情意題 (子題一)',
                      s2q2: '第二大題：情意題 (子題二)',
                    };
                    return (
                      <DraftEditor
                        key={key}
                        title={titleMap[key]}
                        initialText={text}
                        onSave={(newText) => setTranscriptionDraft(prev => prev ? { ...prev, [key]: newText } : null)}
                      />
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setTranscriptionDraft(null)} className="px-6 py-2 rounded-full text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    取消 / 重新設定
                  </button>
                </div>
              </div>
            </div>
          ) : standardDraft ? (
            <div id="preview-image" className="space-y-6 pb-32">
              <div className="p-4 md:p-6 bg-[var(--bg-card)] dark:bg-[#202124] rounded-[1.5rem] border border-slate-200 dark:border-zinc-900 shadow-xl relative overflow-hidden transition-colors duration-300">
                <h2 className="text-base font-black dark:text-white text-slate-900 mb-6 flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs text-white flex-shrink-0">校</span>
                  辨識結果確認 (人工校正)
                </h2>
                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-6 pr-2">
                  {standardDraft.qText && (
                    <DraftEditor
                      title="題目"
                      initialText={standardDraft.qText}
                      onSave={(newText) => setStandardDraft(prev => prev ? { ...prev, qText: newText } : null)}
                    />
                  )}
                  {standardDraft.rText && (
                    <DraftEditor
                      title="標準詳解"
                      initialText={standardDraft.rText}
                      onSave={(newText) => setStandardDraft(prev => prev ? { ...prev, rText: newText } : null)}
                    />
                  )}
                  {standardDraft.sText && (
                    <DraftEditor
                      title="學生作答"
                      initialText={standardDraft.sText}
                      onSave={(newText) => setStandardDraft(prev => prev ? { ...prev, sText: newText } : null)}
                    />
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setStandardDraft(null)} className="px-6 py-2 rounded-full text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    取消 / 重新設定
                  </button>
                </div>
              </div>
            </div>
          ) : isChineseWriting ? (
            <div className="space-y-6 pb-32">
              {/* ✅ 修復點 1：將 bg-white 替換為 bg-[var(--bg-card)] */}
              <div id="upload-zone" className="p-4 md:p-6 bg-[var(--bg-card)] dark:bg-[#202124] rounded-[1.5rem] border border-slate-200 dark:border-zinc-900 shadow-xl relative overflow-hidden transition-colors duration-300">
                  <h2 id="subject-tips" className="text-base font-black dark:text-white text-slate-900 mb-6 flex items-center gap-2 flex-wrap"><span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs text-white flex-shrink-0">知</span>第一大題：知性題</h2>
                  <div className="space-y-6">
                    <SubQuestionInputs num={1} icon="📄" data={chineseAnswers.s1q1} onUpdate={(f, v) => updateChineseAnswer('s1q1', f, v)} />
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 opacity-20"></div>
                    <SubQuestionInputs num={2} icon="📄" data={chineseAnswers.s1q2} onUpdate={(f, v) => updateChineseAnswer('s1q2', f, v)} />
                  </div>
              </div>
              
              {/* ✅ 修復點 2：將 bg-white 替換為 bg-[var(--bg-card)] */}
              <div className="p-4 md:p-6 bg-[var(--bg-card)] dark:bg-[#202124] rounded-[1.5rem] border border-slate-200 dark:border-zinc-900 shadow-xl relative overflow-hidden transition-colors duration-300">
                  <h2 className="text-base font-black dark:text-white text-slate-900 mb-6 flex items-center gap-2 flex-wrap"><span className="bg-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs text-white flex-shrink-0">情</span>第二大題：情意題</h2>
                  <div className="space-y-6">
                    <SubQuestionInputs num={1} icon="📝" data={chineseAnswers.s2q1} onUpdate={(f, v) => updateChineseAnswer('s2q1', f, v)} />
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 opacity-20"></div>
                    <SubQuestionInputs num={2} icon="📝" data={chineseAnswers.s2q2} onUpdate={(f, v) => updateChineseAnswer('s2q2', f, v)} />
                  </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 md:space-y-12 pb-32">
              <AseaUploadField id="tour-standard-q" icon="📄" title="題目圖片 (選填)" subtitle="上傳考題或題目圖片" images={questionImages} onUpload={setQuestionImages} onRemove={(i)=>setQuestionImages(p=>p.filter((_,idx)=>idx!==i))} />
              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-900"></div>
              <AseaUploadField id="tour-standard-r" icon="📖" title="標準詳解 (選填)" subtitle="上傳官方解答或參考詳解" images={referenceImages} onUpload={setReferenceImages} onRemove={(i)=>setReferenceImages(p=>p.filter((_,idx)=>idx!==i))} />
              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-900"></div>
              
              <div id="tour-standard-s" className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">✍️</span>
                  <div><h3 className="text-base font-bold dark:text-zinc-100 text-slate-900">學生作答 (必填)</h3></div>
                </div>
                
                <div className="flex gap-1 p-0.5 bg-slate-200 dark:bg-zinc-900 rounded-full w-fit mb-4 overflow-x-auto max-w-full">
                  <button onClick={() => setAnswerMode('image')} className={`px-4 md:px-5 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${answerMode === 'image' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>影像上傳</button>
                  <button onClick={() => setAnswerMode('text')} className={`px-4 md:px-5 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${answerMode === 'text' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>文字輸入</button>
                </div>

                {answerMode === 'image' ? (
                  <div id="math-format-tip">
                    <div id="chem-ice-tip">
                      <AseaUploadField images={studentImages} onUpload={setStudentImages} onRemove={(i)=>setStudentImages(p=>p.filter((_,idx)=>idx!==i))} />
                    </div>
                  </div>
                ) : (
                  <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="在此輸入學生作答內容..." className="w-full h-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 md:p-6 text-[var(--text-primary)] resize-none outline-none text-sm md:text-base transition-colors duration-300" />
                )}
              </div>
            </div>
          )}
          
          <div id="tour-model-selector" className="border-t border-zinc-200 dark:border-zinc-800 pt-8">
            <ModelSelector selected={gradingModel} onSelect={setGradingModel} />
          </div>
        </>
      )}

      {showResults && <ResultsDisplay results={chineseResults || standardResults} />}

      {!showResults && (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-transparent via-transparent dark:from-transparent dark:via-transparent to-transparent z-40 pointer-events-none pb-safe">
          <div className="w-full max-w-4xl mx-auto pointer-events-auto flex justify-center px-4">
              <button
                id="tour-action-btn"
                onClick={isChineseWriting ? (transcriptionDraft ? onChineseConfirmAndGrade : onChineseTranscribe) : (standardDraft ? onStandardConfirmAndGrade : onStandardTranscribe)}
                disabled={isGrading}
                className="w-full md:w-auto px-6 py-3 md:px-8 md:py-4 bg-blue-600 text-white rounded-2xl font-black text-base md:text-lg shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
              >
                {isGrading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {gradingStatus}
                  </>
                ) : (
                  <><span>{isChineseWriting ? (transcriptionDraft ? '確認無誤，開始批改' : '預覽辨識結果 (Step 1)') : (standardDraft ? '確認無誤，開始批改' : '預覽辨識結果 (Step 1)')}</span><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></>
                )}
              </button>
          </div>
        </div>
      )}

      {isGrading && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                <GradingLoadingState subject={subject.id.replace('gsat-', '').replace('ast-', '') as any} />
                <p className="text-center text-zinc-400 mt-8 font-bold text-sm animate-pulse">{gradingStatus}</p>
            </div>
          </div>
      )}
    </div>
  );
};