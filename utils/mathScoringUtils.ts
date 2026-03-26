import { MathStep, MathStepType, StemSubScore } from '../types';

/** 評分向度字卡所用學門（與大考自然科子卷、知識標籤對齊） */
export type StemDisplayDiscipline =
  | 'biology'
  | 'chemistry'
  | 'physics'
  | 'earth'
  | 'math'
  | 'integrated';

const PAREN_IN_NATURAL = /自然科\s*[（(]\s*([^）)]+)\s*[）)]/;

/** 由科目名稱解析學門（不含單題標籤；勿用 includes('自然') 當生物，否則「自然科」全誤判） */
export function resolveStemDisciplineFromSubject(subjectName: string): StemDisplayDiscipline {
  const s = (subjectName || '').trim();
  const lower = s.toLowerCase();
  const inner = (s.match(PAREN_IN_NATURAL)?.[1] || '').trim();
  const inParen = (t: RegExp) => inner && t.test(inner);

  if (inParen(/化學/i) || lower.includes('化學') || lower.includes('chemistry') || /\bchem\b/.test(lower))
    return 'chemistry';
  if (inParen(/物理/i) || lower.includes('物理') || lower.includes('physics') || /\bphys\b/.test(lower))
    return 'physics';
  if (inParen(/生物/i) || lower.includes('生物') || lower.includes('biology')) return 'biology';
  if (inParen(/地科|地球/i) || lower.includes('地球科學') || lower.includes('地科') || lower.includes('earth science')) return 'earth';
  if (
    lower.includes('數學') ||
    lower.includes('calculus') ||
    lower.includes('數甲') ||
    lower.includes('數b') ||
    lower.includes('數a') ||
    /\bmath\b/.test(lower)
  ) {
    return 'math';
  }
  if (lower.includes('自然科') || lower.includes('跨科') || lower.includes('integrated')) return 'integrated';
  if (lower.includes('science') && !lower.includes('生物') && !lower.includes('化學') && !lower.includes('物理')) return 'integrated';
  /** 與舊版字卡一致：未辨識之 STEM 預設數理向度，避免誤用「綜合自然」文案 */
  return 'math';
}

/**
 * 僅在「自然科／跨科／綜合」時，才用 knowledge_tags／回饋關鍵字細分單題學門；
 * 數學、物理、化學、生物、地科等**單科**一律只依科目名稱，避免內文提到他科就改壞字卡與呈現。
 */
export function resolveStemDisciplineForSub(
  subjectName: string,
  sub: Pick<StemSubScore, 'knowledge_tags' | 'feedback' | 'concept_correction' | 'sub_stem_discipline'>
): StemDisplayDiscipline {
  const fromSubject = resolveStemDisciplineFromSubject(subjectName);
  if (fromSubject !== 'integrated') {
    return fromSubject;
  }

  const fromApi = parseSubStemDisciplineHint(sub.sub_stem_discipline);
  if (fromApi) return fromApi;

  const tags = (Array.isArray(sub.knowledge_tags) ? sub.knowledge_tags : []).join('\n');
  const blob = `${tags}\n${sub.feedback || ''}\n${sub.concept_correction || ''}`;

  const hit = (re: RegExp) => re.test(blob);
  if (hit(/化學|莫耳|化學式|化學鍵|反應式|平衡常數|滴定|chemistry|stoichiometry/i)) return 'chemistry';
  if (hit(/物理|力學|牛頓|動量|能量守恆|電路|伏特|安培|physics/i)) return 'physics';
  if (hit(/生物|演化|細胞|遺傳|光合作用|生態|protein|biology/i)) return 'biology';
  if (hit(/地科|地球|板塊|地震|氣候|天文|洋流|等高線/i)) return 'earth';

  return fromSubject;
}

export function stemDisplayDisciplineLabelZh(d: StemDisplayDiscipline): string {
  const m: Record<StemDisplayDiscipline, string> = {
    biology: '生物',
    chemistry: '化學',
    physics: '物理',
    earth: '地球科學',
    math: '數學',
    integrated: '自然（跨科／綜合）',
  };
  return m[d];
}

/** 解析模型或人工填入之子題學門字串（僅自然科 sub_stem_discipline 使用） */
export function parseSubStemDisciplineHint(raw: unknown): StemDisplayDiscipline | null {
  if (raw == null) return null;
  const s0 = String(raw).trim();
  if (!s0) return null;
  const s = s0.toLowerCase();

  if (/地科|地球科學|地球|earth\s*science|geoscience|\bearth\b/i.test(s0)) return 'earth';
  if (/化學|chemistry/i.test(s0)) return 'chemistry';
  if (/物理|physics/i.test(s0)) return 'physics';
  if (/生物|biology/i.test(s0)) return 'biology';
  if (/跨科|綜合|整合|integrated|general\s*science/i.test(s0)) return 'integrated';

  if (s === 'physics' || s === 'chemistry' || s === 'biology' || s === 'earth' || s === 'integrated') {
    return s as StemDisplayDiscipline;
  }
  return null;
}

/**
 * Calculates the total score by summing up achieved points from steps.
 */
export const calculateStepwiseScore = (steps: MathStep[]): number => {
  return steps.reduce((total, step) => total + (step.pointsAchieved || 0), 0);
};

// Helper to safely parse numbers from potential AI hallucinations (strings, nulls)
const safeParse = (val: any): number => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const match = val.match(/[0-9]+(\.[0-9]+)?/);
    if (match) {
        return parseFloat(match[0]);
    }
  }
  return 0;
};

/**
 * Transforms the raw Gemini STEM results into Process-Oriented Stepwise structure.
 * FIX: Strictly enforces that the sum of step.maxPoints equals the question's max_points.
 * FIX: Clamps achieved points to step max points to prevent numerator exceeding denominator (e.g. 4/3).
 * UPDATE: Supports decimal scoring (0.5 granularity) for low max_points (e.g. 2 points).
 */
export const transformToMathSteps = (subResult: StemSubScore, subjectName: string = ''): MathStep[] => {
  const discipline = resolveStemDisciplineForSub(subjectName || '', subResult);

  // Robustly handle missing keys or misnamed keys from AI (e.g. conceptual_modeling instead of setup)
  // If keys are missing, safeParse defaults to 0, preventing "Actual: 0" display bugs from crashing the calculation logic
  const rawSetup = safeParse(subResult.setup) || safeParse((subResult as any).conceptual_modeling);
  const rawProcess = (safeParse(subResult.process) || safeParse((subResult as any).core_computation)) + safeParse(subResult.logic);
  const rawResult = safeParse(subResult.result) || safeParse((subResult as any).logical_integration);
  
  // 1. Determine Total Max based strictly on AI's extracted max_points (or default)
  // We generally trust the integer provided, but it might be a float in rare cases.
  let declaredMax = (subResult.max_points && typeof subResult.max_points === 'number' && subResult.max_points > 0) ? subResult.max_points : 5;
  
  // 2. Calculate Base Distribution (Buckets)
  let setupMax = 0, resultMax = 0, processMax = 0;
  
  if (declaredMax <= 4) {
     // Small Point Distribution (e.g., 2, 3, 4 points)
     // Enable 0.5 granularity logic
     // Target Ratio: ~25% Setup, ~50% Process, ~25% Result
     
     // 1. Calculate ideal values
     const idealSetup = declaredMax * 0.25;
     const idealResult = declaredMax * 0.25;
     
     // 2. Round to nearest 0.5
     setupMax = Math.round(idealSetup * 2) / 2;
     resultMax = Math.round(idealResult * 2) / 2;
     
     // 3. Ensure minimum allocation (at least 0.5 if total allows) unless total is very small
     if (declaredMax >= 1) {
         if (setupMax < 0.5) setupMax = 0.5;
         if (resultMax < 0.5) resultMax = 0.5;
     }

     // 4. Assign remainder to Process
     processMax = declaredMax - setupMax - resultMax;
     
     // 5. Sanity check: if processMax is negative or 0 due to rounding on very small numbers (e.g. 1pt), adjust.
     if (processMax <= 0 && declaredMax > 1) {
         // Steal from result or setup
         if (resultMax >= 0.5) { resultMax -= 0.5; processMax += 0.5; }
         else if (setupMax >= 0.5) { setupMax -= 0.5; processMax += 0.5; }
     }
     
     // Precision fix
     processMax = Math.round(processMax * 2) / 2;

  } else {
     // Standard Distribution (Approx CEEC Standard: 25% Concept, 60% Process, 15% Result)
     // Use Math.round for integers to keep UI clean for larger numbers
     setupMax = Math.max(1, Math.round(declaredMax * 0.25));
     resultMax = Math.max(1, Math.round(declaredMax * 0.15));
     processMax = declaredMax - setupMax - resultMax;
  }

  let labels: {
    setup: string;
    setupFb: string;
    process: string;
    processFb: string;
    result: string;
    resultFb: string;
  };

  if (discipline === 'biology') {
    labels = {
      setup: "CONCEPTUAL MASTERY (DEFINITION)",
      setupFb: "正確定義生物學名詞與核心概念",
      process: "MECHANISTIC PROCESS (EXPLANATION)",
      processFb: "詳述生理機制、實驗流程或交互作用",
      result: "LOGICAL SYNTHESIS (CONCLUSION)",
      resultFb: "整合因果關係並推導出精確結論",
    };
  } else if (discipline === 'chemistry') {
    labels = {
      setup: "CHEMICAL SETUP (EQUATION)",
      setupFb: "化學反應式列式與平衡正確性",
      process: "STOICHIOMETRY (CALCULATION)",
      processFb: "計量化學運算與單位換算",
      result: "ANALYTICAL RESULT (ANSWER)",
      resultFb: "最終答案數值與有效數字",
    };
  } else if (discipline === 'earth') {
    labels = {
      setup: "DATA & CONTEXT SETUP",
      setupFb: "正確判讀圖表、空間分布或觀測條件",
      process: "PROCESS REASONING",
      processFb: "依地科概念說明成因、機制或時間序列變化",
      result: "SYNTHESIS & CONCLUSION",
      resultFb: "整合證據並下出與題幹一致的結論",
    };
  } else if (discipline === 'integrated') {
    labels = {
      setup: "CONCEPT SETUP (DEFINITION)",
      setupFb: "正確萃取題幹關鍵名詞、變因與已知條件",
      process: "REASONING & ANALYSIS",
      processFb: "依據科學概念逐步推演與論證",
      result: "CONCLUSION & PRECISION",
      resultFb: "答案與單位、有效數字或題意要求一致",
    };
  } else {
    // math / physics
    labels = {
      setup: "Conceptual Modeling (Definition)",
      setupFb: "正確設定公式與變數定義",
      process: "Core Computation (Process)",
      processFb: "運算過程與邏輯推演",
      result: "Logical Integration (Result)",
      resultFb: "最終答案精確性驗證",
    };
  }

  // 3. Create Steps with Clamping
  // We clamp pointsAchieved to maxPoints to ensure the total score never exceeds declaredMax.

  const definitionStep: MathStep = {
    label: labels.setup,
    type: 'definition',
    maxPoints: setupMax, 
    pointsAchieved: Math.min(rawSetup, setupMax), 
    isAchieved: rawSetup >= (setupMax * 0.3), 
    feedback: labels.setupFb
  };

  const processStep: MathStep = {
    label: labels.process,
    type: 'process',
    maxPoints: processMax,
    pointsAchieved: Math.min(rawProcess, processMax),
    isAchieved: rawProcess >= (processMax * 0.3),
    feedback: labels.processFb
  };

  const resultStep: MathStep = {
    label: labels.result,
    type: 'result',
    maxPoints: resultMax,
    pointsAchieved: Math.min(rawResult, resultMax),
    isAchieved: rawResult >= (resultMax * 0.5),
    feedback: labels.resultFb
  };

  return [definitionStep, processStep, resultStep];
};

/** 與 AstMathAStrategy「Actual score」同源：分桶上限後的得分，供 ResultsDisplay 總分對齊。 */
export const getStemSubAchievedPoints = (subResult: StemSubScore, subjectName: string = ''): number => {
  const steps = transformToMathSteps(subResult, subjectName);
  return calculateStepwiseScore(Array.isArray(steps) ? steps : []);
};

export const getStepColor = (type: MathStepType, isAchieved: boolean) => {
  /** 未得分時勿用深底淺字（化學等分科在暗色主題下說明文字幾乎無法閱讀） */
  if (!isAchieved) {
    switch (type) {
      case 'definition':
        return 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] border-l-4 border-l-blue-500/45';
      case 'process':
        return 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] border-l-4 border-l-violet-500/45';
      case 'result':
        return 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] border-l-4 border-l-emerald-500/45';
      default:
        return 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)]';
    }
  }

  /** 整卡套用淺色字（text-blue-400 等）在淺色主題下對比過低，改以底色區分、正文用主題字色 */
  switch (type) {
    case 'definition': return 'bg-blue-500/15 text-[var(--text-primary)] border border-blue-500/35';
    case 'process': return 'bg-violet-500/15 text-[var(--text-primary)] border border-violet-500/35';
    case 'result': return 'bg-emerald-500/15 text-[var(--text-primary)] border border-emerald-500/35';
    default: return 'bg-zinc-800 text-zinc-300';
  }
};

export const getStepIcon = (type: MathStepType) => {
  switch (type) {
    case 'definition': return '📐';
    case 'process': return '⚙️';
    case 'result': return '🏁';
    default: return '•';
  }
};
