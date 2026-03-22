
import { useState, useRef, useEffect } from 'react';
import { 
  PhaseStatus, 
  GradingResults, 
  ChineseWritingResults, 
  Subject, 
  ChineseTaskContent, 
  SectionResult,
  ActivityType,
  QuestionSet
} from '../types';
import {
  transcribeHandwrittenImages,
  generateReferenceSolution,
  runLinguisticAudit,
  runSubjectExpertAnalysis,
  runModeratorSynthesis,
  transcribeChineseGroup,
  analyzeChineseSection,
  getChineseOverallRemarks
} from '../geminiService';
import { GradingModel } from '../components/ModelSelector';
import { useAppContext } from '@/contexts/AppContext';

function isAbortError(e: unknown): boolean {
  return (
    (typeof e === 'object' &&
      e !== null &&
      'name' in e &&
      (e as { name: string }).name === 'AbortError') ||
    (e instanceof DOMException && e.name === 'AbortError')
  );
}

export const useGrading = () => {
  const gradingAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      gradingAbortRef.current?.abort();
    };
  }, []);

  const [isGrading, setIsGrading] = useState(false);
  const [gradingStatus, setGradingStatus] = useState('');
  const [chineseResults, setChineseResults] = useState<ChineseWritingResults | null>(null);
  const [standardResults, setStandardResults] = useState<GradingResults | null>(null);
  const [p1, setP1] = useState(PhaseStatus.IDLE);
  const [p2, setP2] = useState(PhaseStatus.IDLE);
  const [p3, setP3] = useState(PhaseStatus.IDLE);

  const { user, profile, setShowAuth, setShowPaywall, consumeCredit } = useAppContext();

  const resetState = () => {
    gradingAbortRef.current?.abort();
    setChineseResults(null);
    setStandardResults(null);
    setP1(PhaseStatus.IDLE);
    setP2(PhaseStatus.IDLE);
    setP3(PhaseStatus.IDLE);
    setGradingStatus('');
  };

  const getPersonaInstructions = (model: GradingModel): string => {
    switch(model) {
        case 'strict':
            return `\n[SYSTEM MODE: Strict Examiner] You are a highly rigorous grader. Focus intensely on grammar, syntax, calculation steps, and terminology accuracy. Deduct points for minor errors. Be critical and direct.`;
        case 'creative':
            return `\n[SYSTEM MODE: Creative Mentor] You are an encouraging mentor. Focus on the student's ideas, creativity, and potential. Offer inspiring feedback and highlight unique approaches. Be warm and supportive.`;
        case 'socratic':
            return `\n[SYSTEM MODE: Socratic Tutor] You are a Socratic tutor. Do not just correct errors; explain the 'why' and ask guiding questions to help the student think deeper. Focus on logic gaps and reasoning.`;
        default:
            return `\n[SYSTEM MODE: Standard Balanced] Provide a balanced assessment covering both strengths and weaknesses. Be fair and constructive.`;
    }
  };

  const transcribeStandardOnly = async (
    questionImages: string[],
    referenceImages: string[],
    studentImages: string[],
    inputText: string,
    answerMode: 'image' | 'text'
  ): Promise<{ qText: string, rText: string, sText: string } | null> => {
    if (!user) { setShowAuth(true); return null; }
    if (!profile?.isPro && (profile?.credits === undefined || profile.credits <= 0)) { setShowPaywall(true); return null; }

    setIsGrading(true);
    setGradingStatus('正在進行影像文字轉錄...');
    setP1(PhaseStatus.LOADING);
    
    try {
      const [qText, rText, sText] = await Promise.all([
        transcribeHandwrittenImages(questionImages, 'question'), 
        transcribeHandwrittenImages(referenceImages, 'question'),
        answerMode === 'text' ? Promise.resolve(inputText) : transcribeHandwrittenImages(studentImages, 'answer')
      ]);
      
      setP1(PhaseStatus.COMPLETED);
      return { qText, rText, sText };
    } catch (e: any) {
      setGradingStatus(`轉錄失敗：${e.message}`);
      setP1(PhaseStatus.ERROR);
      return null;
    } finally {
      setIsGrading(false);
    }
  };

  const gradeStandardFromText = async (
    selectedSubject: Subject,
    qText: string,
    rText: string,
    sText: string,
    customInstructions: string,
    gradingModel: GradingModel,
    logActivity: (entry: any) => void,
    onComplete: () => void
  ) => {
    if (!selectedSubject) return;
    if (!user) { setShowAuth(true); return; }
    if (!profile?.isPro && (profile?.credits === undefined || profile.credits <= 0)) { setShowPaywall(true); return; }

    const hasStudentInput = sText.trim().length > 0;
    const finalInstructions = customInstructions + getPersonaInstructions(gradingModel);

    setIsGrading(true);
    setGradingStatus(hasStudentInput ? '進行深度評核中...' : '未偵測到學生作答，正在生成標準詳解...');
    setP1(PhaseStatus.COMPLETED);
    setP2(PhaseStatus.LOADING);
    setP3(PhaseStatus.IDLE);

    gradingAbortRef.current?.abort();
    const gradingController = new AbortController();
    gradingAbortRef.current = gradingController;
    const { signal } = gradingController;
    
    try {
      const combinedContent = `題目：${qText}\n詳解：${rText}\n學生：${sText}`;
      const rawStudentText = sText || combinedContent;

      if (!hasStudentInput) {
        setGradingStatus('未偵測到學生作答，正在生成標準詳解...');
        setP1(PhaseStatus.IDLE);
        setP2(PhaseStatus.IDLE);
        setP3(PhaseStatus.LOADING);
        try {
          const solution = await generateReferenceSolution(
            combinedContent,
            selectedSubject.name,
            finalInstructions
          );
          setP3(PhaseStatus.COMPLETED);

          const res: GradingResults = {
            phase1: { technical_proficiency_score: 0, grammatical_observations: [], word_count: 0, basic_syntax_check: "N/A" },
            phase2: { qualitative_merit_score: 0, reasoning_critique: "N/A", critical_thinking_level: "N/A" },
            phase3: solution,
            timestamp: Date.now(),
            subjectName: selectedSubject.name,
            id: Math.random().toString(36).substr(2, 9),
            originalContent: "",
            isSolutionOnly: true
          };
          setStandardResults(res);
          logActivity({
            id: res.id,
            type: 'grading',
            title: `${selectedSubject.name} 標準詳解生成`,
            description: `已完成`,
            timestamp: res.timestamp,
            data: res
          });
        } catch (e) {
          if (isAbortError(e)) {
            setP3(PhaseStatus.IDLE);
            setGradingStatus('');
            return;
          }
          setP3(PhaseStatus.ERROR);
          setGradingStatus(e instanceof Error ? e.message : '');
          return;
        }
      } else {
        const [audit, expert] = await Promise.all([
          runLinguisticAudit(combinedContent, selectedSubject.name, finalInstructions)
            .then(res => { setP1(PhaseStatus.COMPLETED); return res; })
            .catch(err => { console.error("Audit Failed", err); setP1(PhaseStatus.ERROR); return null; }),
          runSubjectExpertAnalysis(combinedContent, selectedSubject.name, finalInstructions)
            .then(res => { setP2(PhaseStatus.COMPLETED); return res; })
            .catch(err => { console.error("Expert Failed", err); setP2(PhaseStatus.ERROR); return null; })
        ]);
  
        const safeAudit = audit || { technical_proficiency_score: 0, grammatical_observations: [], word_count: 0, basic_syntax_check: "N/A" };
        const safeExpert = expert || { qualitative_merit_score: 0, reasoning_critique: "N/A", critical_thinking_level: "N/A" };
  
        setP3(PhaseStatus.LOADING);
        try {
          const moderator = await runModeratorSynthesis(
            combinedContent,
            selectedSubject.name,
            safeAudit,
            safeExpert,
            finalInstructions
          );
          setP3(PhaseStatus.COMPLETED);
          
          const res: GradingResults = {
            phase1: safeAudit, phase2: safeExpert, phase3: moderator,
            timestamp: Date.now(), subjectName: selectedSubject.name, id: Math.random().toString(36).substr(2, 9),
            originalContent: rawStudentText,
            isSolutionOnly: false
          };
          setStandardResults(res);
          const realScore = (res as any).overallScore || (res as any).totalScore || (res as any).score || (res as any).grade || moderator.ceec_results?.total_score || moderator.final_score || '未提供';
          
          logActivity({
            id: res.id,
            type: 'grading',
            title: `${selectedSubject.name} 批改完成`,
            description: `得分：${realScore} 分`,
            timestamp: res.timestamp,
            data: res
          });
        } catch (e) {
          console.error('[Grading Fatal Error]', e, '\nPayload:', { audit: safeAudit, expert: safeExpert, instructions: finalInstructions });
          if (isAbortError(e)) {
            setP3(PhaseStatus.IDLE);
            setGradingStatus('');
            return;
          }
          setP3(PhaseStatus.ERROR);
          setGradingStatus(e instanceof Error ? e.message : '');
          return;
        }
      }
      consumeCredit();
      onComplete();
    } catch (e) {
      if (isAbortError(e)) {
        setGradingStatus('');
        setP3(PhaseStatus.IDLE);
        return;
      }
      setGradingStatus(e instanceof Error ? e.message : '');
      setP3(PhaseStatus.ERROR);
    } finally {
      setIsGrading(false);
    }
  };

  const handleGradeStandard = async (
    selectedSubject: Subject,
    questionImages: string[],
    referenceImages: string[],
    studentImages: string[],
    inputText: string,
    answerMode: 'image' | 'text',
    customInstructions: string,
    gradingModel: GradingModel,
    logActivity: (entry: any) => void,
    onComplete: () => void
  ) => {
    const draft = await transcribeStandardOnly(questionImages, referenceImages, studentImages, inputText, answerMode);
    if (!draft) return;
    await gradeStandardFromText(selectedSubject, draft.qText, draft.rText, draft.sText, customInstructions, gradingModel, logActivity, onComplete);
  };

  const transcribeChineseOnly = async (
    chineseAnswers: Record<string, QuestionSet>
  ): Promise<Record<string, string> | null> => {
    if (!user) { setShowAuth(true); return null; }
    if (!profile?.isPro && (profile?.credits === undefined || profile.credits <= 0)) { setShowPaywall(true); return null; }

    const getPayload = (key: string) => {
        const d = chineseAnswers[key];
        return { q: d.q, r: d.r, s: d.mode === 'text' ? d.text : d.s };
    };
    
    const hasInput = (key: string) => {
        const d = chineseAnswers[key];
        return (d.mode === 'image' && d.s.length > 0) || (d.mode === 'text' && d.text.trim().length > 0);
    };

    const isValid = (key: string) => chineseAnswers[key].q.length > 0 || hasInput(key);

    setIsGrading(true);
    setGradingStatus('步驟 1/3: 轉錄國寫內容...');
    setP1(PhaseStatus.LOADING);
    
    try {
      const keys = ['s1q1', 's1q2', 's2q1', 's2q2'];
      const transcriptions = await Promise.all(
        keys.map(k => isValid(k) ? transcribeChineseGroup(getPayload(k).q, getPayload(k).r, getPayload(k).s) : null)
      );

      const section1Subs = [transcriptions[0], transcriptions[1]].filter(x => x !== null) as ChineseTaskContent[];
      const section2Subs = [transcriptions[2], transcriptions[3]].filter(x => x !== null) as ChineseTaskContent[];

      if (section1Subs.length === 0 && section2Subs.length === 0) throw new Error("請至少上傳一個子題。");
      
      setP1(PhaseStatus.COMPLETED);
      
      const draft: Record<string, string> = {};
      keys.forEach((k, index) => {
        if (transcriptions[index]) {
          draft[k] = transcriptions[index]!.student;
        }
      });

      return draft;
    } catch (e: any) {
      setGradingStatus(`轉錄失敗：${e.message}`);
      setP1(PhaseStatus.ERROR);
      return null;
    } finally {
      setIsGrading(false);
    }
  };

  const gradeChineseFromText = async (
    chineseAnswers: Record<string, QuestionSet>,
    confirmedTexts: Record<string, string>,
    customInstructions: string,
    gradingModel: GradingModel,
    logActivity: (entry: any) => void,
    onComplete: () => void
  ) => {
    if (!user) { setShowAuth(true); return; }
    if (!profile?.isPro && (profile?.credits === undefined || profile.credits <= 0)) { setShowPaywall(true); return; }

    const getPayload = (key: string) => {
        const d = chineseAnswers[key];
        return { q: d.q, r: d.r };
    };
    
    const hasInput = (key: string) => {
        const d = chineseAnswers[key];
        return (d.mode === 'image' && d.s.length > 0) || (d.mode === 'text' && d.text.trim().length > 0);
    };

    const hasStudentInput = ['s1q1', 's1q2', 's2q1', 's2q2'].some(k => hasInput(k));
    const finalInstructions = customInstructions + getPersonaInstructions(gradingModel);

    setIsGrading(true);
    setGradingStatus(hasStudentInput ? '步驟 2/3: 進行 CEEC 深度評核中...' : '步驟 2/3: 正在生成標準範文...');
    setP2(PhaseStatus.LOADING);
    
    try {
      const keys = ['s1q1', 's1q2', 's2q1', 's2q2'];
      const transcriptions = await Promise.all(
        keys.map(k => confirmedTexts[k] !== undefined ? transcribeChineseGroup(getPayload(k).q, getPayload(k).r, confirmedTexts[k]) : null)
      );

      const section1Subs = [transcriptions[0], transcriptions[1]].filter(x => x !== null) as ChineseTaskContent[];
      const section2Subs = [transcriptions[2], transcriptions[3]].filter(x => x !== null) as ChineseTaskContent[];

      const analyses = await Promise.all([
        section1Subs.length > 0 ? analyzeChineseSection("第一大題：知性題", section1Subs, finalInstructions) : null,
        section2Subs.length > 0 ? analyzeChineseSection("第二大題：情意題", section2Subs, finalInstructions) : null
      ]);

      const validAnalyses = analyses.filter(x => x !== null) as SectionResult[];
      
      // 防呆機制: 將人工確認後的原文存入 SectionResult.originalText
      validAnalyses.forEach(section => {
        if (section.section_title.includes("第一大題")) {
          section.originalText = [confirmedTexts['s1q1'], confirmedTexts['s1q2']].filter(Boolean).join('\n\n');
        } else if (section.section_title.includes("第二大題")) {
          section.originalText = [confirmedTexts['s2q1'], confirmedTexts['s2q2']].filter(Boolean).join('\n\n');
        }
      });

      setP2(PhaseStatus.COMPLETED);
      setP3(PhaseStatus.LOADING);
      setGradingStatus('步驟 3/3: 彙整總結...');
      const overall = await getChineseOverallRemarks(validAnalyses);
      setP3(PhaseStatus.COMPLETED);
      
      const finalResults = {
        sections: validAnalyses,
        overall_remarks: overall,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9),
        isSolutionOnly: !hasStudentInput
      };
      
      setChineseResults(finalResults);
      const totalScore = validAnalyses.reduce((acc, section) => acc + (Number(section.total_section_score) || 0), 0);
      const realScore = totalScore > 0 ? totalScore : '未提供';

      logActivity({
        id: finalResults.id,
        type: 'grading',
        title: hasStudentInput ? '國寫批改完成' : '國寫範文生成',
        description: hasStudentInput ? `得分：${realScore} 分` : `已完成`,
        timestamp: finalResults.timestamp,
        data: finalResults
      });
      consumeCredit();
      onComplete();

    } catch (e) {
      setGradingStatus(e instanceof Error ? e.message : '');
      setP2(PhaseStatus.ERROR);
      setP3(PhaseStatus.ERROR);
    } finally {
      setIsGrading(false);
      if (!isGrading) setGradingStatus('');
    }
  };

  const cancelGrading = () => {
    gradingAbortRef.current?.abort();
  };

  return { 
    isGrading, 
    gradingStatus, 
    chineseResults, 
    standardResults, 
    p1, p2, p3,
    setChineseResults,
    setStandardResults,
    resetState,
    cancelGrading,
    handleGradeStandard,
    transcribeStandardOnly,
    gradeStandardFromText,
    transcribeChineseOnly,
    gradeChineseFromText
  };
};
