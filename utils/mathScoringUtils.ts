
import { MathStep, MathStepType, StemSubScore } from '../types';

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
  const safeSubjectName = subjectName || '';
  const normalizedSubject = safeSubjectName.toLowerCase();
  
  const isBiology = normalizedSubject.includes('biology') || normalizedSubject.includes('生物') || normalizedSubject.includes('science') || normalizedSubject.includes('自然');
  const isChemistry = normalizedSubject.includes('chemistry') || normalizedSubject.includes('化學');

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

  let labels;
  
  if (isBiology) {
    labels = {
      setup: "CONCEPTUAL MASTERY (DEFINITION)",
      setupFb: "正確定義生物學名詞與核心概念",
      process: "MECHANISTIC PROCESS (EXPLANATION)",
      processFb: "詳述生理機制、實驗流程或交互作用",
      result: "LOGICAL SYNTHESIS (CONCLUSION)",
      resultFb: "整合因果關係並推導出精確結論"
    };
  } else if (isChemistry) {
    labels = {
      setup: "CHEMICAL SETUP (EQUATION)",
      setupFb: "化學反應式列式與平衡正確性",
      process: "STOICHIOMETRY (CALCULATION)",
      processFb: "計量化學運算與單位換算",
      result: "ANALYTICAL RESULT (ANSWER)",
      resultFb: "最終答案數值與有效數字"
    };
  } else {
    // Math / Physics Defaults
    labels = {
      setup: "Conceptual Modeling (Definition)",
      setupFb: "正確設定公式與變數定義",
      process: "Core Computation (Process)",
      processFb: "運算過程與邏輯推演",
      result: "Logical Integration (Result)",
      resultFb: "最終答案精確性驗證"
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

export const getStepColor = (type: MathStepType, isAchieved: boolean) => {
  if (!isAchieved) return 'bg-zinc-800 text-zinc-500 border-zinc-700/50';
  
  switch (type) {
    case 'definition': return 'bg-blue-600/20 text-blue-400 border-blue-500/50';
    case 'process': return 'bg-purple-600/20 text-purple-400 border-purple-500/50';
    case 'result': return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50';
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
