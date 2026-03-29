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
  const s = (subjectName || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!s) return 'math';
  /** 題目／活動標題中「物 理」「物　理」等會導致 includes('物理') 失敗，分科物理被判成數學 */
  const compactCJK = s.replace(/\s+/g, '');
  const lower = s.toLowerCase();
  const inner = (s.match(PAREN_IN_NATURAL)?.[1] || '').trim();
  const inParen = (t: RegExp) => inner && t.test(inner);

  if (
    inParen(/化學/i) ||
    s.includes('化學') ||
    compactCJK.includes('化學') ||
    lower.includes('chemistry') ||
    /\bchem\b/.test(lower)
  ) {
    return 'chemistry';
  }
  if (
    inParen(/物理/i) ||
    s.includes('物理') ||
    compactCJK.includes('物理') ||
    lower.includes('physics') ||
    /\bphys\b/.test(lower)
  ) {
    return 'physics';
  }
  if (
    inParen(/生物/i) ||
    s.includes('生物') ||
    compactCJK.includes('生物') ||
    lower.includes('biology')
  ) {
    return 'biology';
  }
  if (
    inParen(/地科|地球/i) ||
    s.includes('地科') ||
    s.includes('地球科學') ||
    compactCJK.includes('地科') ||
    compactCJK.includes('地球科學') ||
    lower.includes('earth science')
  ) {
    return 'earth';
  }
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
 * 數學科保留上方四格（Setup/Process/Logic/Result）與進度條；
 * 其餘理科 stem（物理／化學／生物／地科／自然跨科）與下方 transformToMathSteps 三向度同源，隱藏上排以免重複版面。
 */
export function stemSubjectHidesFourMetricRow(discipline: StemDisplayDiscipline): boolean {
  return discipline !== 'math';
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
    const asciiDigits = val.replace(/[\uFF10-\uFF19]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
    );
    const match = asciiDigits.match(/[0-9]+(\.[0-9]+)?/);
    if (match) {
      return parseFloat(match[0]);
    }
  }
  return 0;
};

/**
 * 與 transformToMathSteps 一致：由該子題滿分推算三向度桶上限（單一來源，避免回填與 UI 不一致）。
 */
export function getStemSubBucketMaxes(maxPoints: unknown): {
  declaredMax: number;
  setupMax: number;
  processMax: number;
  resultMax: number;
} {
  const declaredMax =
    maxPoints && typeof maxPoints === 'number' && maxPoints > 0 ? maxPoints : 5;
  let setupMax = 0,
    resultMax = 0,
    processMax = 0;

  if (declaredMax <= 4) {
    const idealSetup = declaredMax * 0.25;
    const idealResult = declaredMax * 0.25;
    setupMax = Math.round(idealSetup * 2) / 2;
    resultMax = Math.round(idealResult * 2) / 2;
    if (declaredMax >= 1) {
      if (setupMax < 0.5) setupMax = 0.5;
      if (resultMax < 0.5) resultMax = 0.5;
    }
    processMax = declaredMax - setupMax - resultMax;
    if (processMax <= 0 && declaredMax > 1) {
      if (resultMax >= 0.5) {
        resultMax -= 0.5;
        processMax += 0.5;
      } else if (setupMax >= 0.5) {
        setupMax -= 0.5;
        processMax += 0.5;
      }
    }
    processMax = Math.round(processMax * 2) / 2;
  } else {
    setupMax = Math.max(1, Math.round(declaredMax * 0.25));
    resultMax = Math.max(1, Math.round(declaredMax * 0.15));
    processMax = declaredMax - setupMax - resultMax;
  }

  return { declaredMax, setupMax, processMax, resultMax };
}

/**
 * 將子題實得分拆入 setup/process/result（logic=0），加總貼近 earned 且不超過各桶上限。
 * 供 Phase3 JSON 漏掉四分項時，依 final_score 與 max_points 回填。
 */
export function allocateStemSubQuartetFromEarned(
  earned: number,
  maxPoints: unknown,
): { setup: number; process: number; result: number; logic: number } {
  const { declaredMax, setupMax, processMax, resultMax } = getStemSubBucketMaxes(maxPoints);
  const E = Math.max(0, Math.min(Number(earned) || 0, declaredMax));
  const capSum = setupMax + processMax + resultMax;
  if (capSum <= 0 || E === 0) return { setup: 0, process: 0, result: 0, logic: 0 };

  const round05 = (x: number) => Math.round(Math.max(0, x) * 2) / 2;
  let setup = round05((E * setupMax) / capSum);
  setup = Math.min(setup, setupMax);
  let result = round05((E * resultMax) / capSum);
  result = Math.min(result, resultMax);
  let process = round05(E - setup - result);
  process = Math.min(process, processMax);

  let diff = E - setup - process - result;
  if (diff > 0.001) {
    const addP = Math.min(processMax - process, diff);
    process += addP;
    diff -= addP;
    const addS = Math.min(setupMax - setup, diff);
    setup += addS;
    diff -= addS;
    result = Math.min(resultMax, result + diff);
  }

  return { setup, process, result, logic: 0 };
}

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

  // #region agent log
  if (discipline === 'physics' && typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '875c85' },
      body: JSON.stringify({
        sessionId: '875c85',
        runId: 'post-fix',
        hypothesisId: 'H2',
        location: 'mathScoringUtils.ts:transformToMathSteps:physics',
        message: 'raw sub scores vs safeParse',
        data: {
          inSetup: subResult.setup,
          inProcess: subResult.process,
          inResult: subResult.result,
          inLogic: subResult.logic,
          rawSetup,
          rawProcess,
          rawResult,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const { declaredMax, setupMax, processMax, resultMax } = getStemSubBucketMaxes(subResult.max_points);

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
  } else if (discipline === 'physics') {
    labels = {
      setup: "PHYSICAL MODELING (SETUP)",
      setupFb: "正確建立物理模型、受力／情境圖與已知條件",
      process: "QUANTITATIVE ANALYSIS (PROCESS)",
      processFb: "正確選用定律、代數推導與單位／因次一致",
      result: "VALIDATED RESULT (ANSWER)",
      resultFb: "數值、方向與有效數字符合題意與實驗精度",
    };
  } else {
    // math
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

/**
 * 詳解與五段式等欄位之算式排版：強制逐步換行，與矩陣「列」專用之 FLAT 規則分離。
 * 僅供 `generatePrompt` 拼接，不影響配分或轉錄。
 */
export const MATH_SOLUTION_TYPOGRAPHY_PROMPT_APPENDIX = `
# ════════════════════════════════════════════════════════════════════════════
# SOLUTION TYPOGRAPHY MANDATE（參考詳解 — 算式逐行呈現 — CRITICAL）
# ════════════════════════════════════════════════════════════════════════════
- **Scope**: Applies to \`correct_calculation\`, \`zero_compression\` fields (\`given\`, \`formula\`, \`substitute\`, \`derive\`, \`answer\`), and any stepwise solution strings where you show **multi-step algebra or numeric work**. Does **not** replace the separate **matrix-row** rule: inside \`\\\\begin{bmatrix}...\\\\end{bmatrix}\` (or pmatrix), matrix **rows** still use \`\\\\\\\\\` (four backslashes in JSON) only — that is unrelated to separating **derivation steps**.
- **One major step per line**: Do NOT cram multiple equation transformations into one prose paragraph or one undifferentiated \`$$...$$\` blob. Each logically distinct step (e.g. substitute → simplify → solve) MUST appear on its **own** line or block.
- **Preferred LaTeX**: Use a block \`$$ \\\\begin{aligned} ... \\\\end{aligned} $$\` and put **one equation or relation per row**, ending each row with \`\\\\\\\\\` (JSON-escaped as needed). Alternatively use **multiple** separate \`$$...$$\` blocks with blank lines or \`\\\\n\` between them.
- **FORBIDDEN**: Chaining many \`=\` steps in a single line inside one display; hiding five steps inside one paragraph with only commas.
- **Traditional Chinese** prose may introduce each step; keep math displays **vertically separated** for readability.
`;

/**
 * Phase 3 數學策略共用附錄：題組內每一 `stem_sub_results` 子項須獨立填寫 `visualization_code`（或該子純代數時為 `null`），
 * 與 `sub_id` 語意對齊。僅供 `generatePrompt` 拼接，不影響配分計算。
 */
export const MATH_SUBQUESTION_GEOMETRY_VIZ_PROMPT_APPENDIX = `
# ════════════════════════════════════════════════════════════════════════════
# SUB-QUESTION VISUALIZATION MANDATE（題組子題獨立圖示 — CRITICAL）
# ════════════════════════════════════════════════════════════════════════════
- **Every** object in \`stem_sub_results[]\` MUST include the key \`visualization_code\`: either \`null\` **or** \`{ "explanation": "...", "visualizations": [ ... ] }\` with at least one **client-renderable** item when **that specific** sub-question benefits from any diagram (plane or solid geometry, coordinate graphs, vectors, function plots, etc.).
- **Per \`sub_id\` binding**: \`visualization_code.explanation\` MUST describe the figure **for that sub-question only** and MUST mention that row's \`sub_id\` (題號／小題編號) in the **first sentence**. **FORBIDDEN**: outputting diagrams only on the first \`stem_sub_results\` item while later items omit \`visualization_code\` yet their written solution still depends on a figure — if a later sub needs a visual, that same row MUST contain its own \`visualization_code\` (you may repeat an equivalent \`geometry_json\` or \`svg_diagram\` when the printed figure is shared across subs).
- **Per-item titles**: Each object in \`visualizations[]\` that has a \`title\` field SHOULD include that same row's \`sub_id\` in the title (e.g. "（小題乙）座標平面示意") so the UI clearly ties the figure to the sub-question index.
- **Pure algebra / no diagram** for one sub: set \`visualization_code\` to \`null\` **only for that sub**.
- **Types** (same as above sections): printed / regular-polygon → \`geometry_json\`; self-authored 2D → \`svg_diagram\` with full \`svgCode\`; 3D → \`plotly_chart\`; explicit functions → \`python_plot\` with required fields or \`plotly_chart\`.
- **Scoring JSON**: Never remove or repurpose \`setup\`, \`process\`, \`result\`, \`logic\`, \`max_points\`, etc. \`visualization_code\` remains auxiliary only.
- **Distinct figures per sub**: If sub-questions in a group have **different** figures (forces, circuits, trajectories, coordinates), you MUST NOT copy the parent stem's diagram unchanged into later rows — each row's \`visualization_code\` must match **that** sub's physics/geometry (adapt coordinates, forces, or traces accordingly).
`;

/**
 * Phase 3 物理策略專用：題組內每一 `stem_sub_results` 子項獨立 `visualization_code`（力學 FBD、斜面、電路、光路、3D plotly 等）。
 * 僅供 `generatePrompt` 拼接，不影響配分或轉錄。
 */
export const PHYSICS_SUBQUESTION_VIZ_PROMPT_APPENDIX = `
# ════════════════════════════════════════════════════════════════════════════
# SUB-QUESTION VISUALIZATION MANDATE — PHYSICS（物理題組子題獨立圖示 — CRITICAL）
# ════════════════════════════════════════════════════════════════════════════
- **Every** object in \`stem_sub_results[]\` MUST include the key \`visualization_code\`: either \`null\` **or** \`{ "explanation": "...", "visualizations": [ ... ] }\` with at least one **client-renderable** item when **that** sub-question needs a diagram (free-body, inclined plane, pulley, circuit, optics ray path, \`plotly_chart\` 3D trajectory, \`geometry_json\`, experiment graphs, etc.).
- **Per \`sub_id\` binding**: \`visualization_code.explanation\` MUST describe the figure **for that sub-question only** and MUST mention that row's \`sub_id\` (題號／小題編號) in the **first sentence**. **FORBIDDEN**: placing diagrams only on the first \`stem_sub_results\` row while later rows have \`null\` yet their solution still relies on a different figure — each such row MUST carry its own \`visualization_code\`.
- **Per-item titles**: Each \`visualizations[]\` item with a \`title\` SHOULD include that row's \`sub_id\` (e.g. "（乙）受力分析圖").
- **Pure algebra / no figure** for one sub: \`visualization_code\` may be \`null\` **only for that sub**.
- **Types**: Mechanics / circuits / optics → \`svg_diagram\` (\`svgCode\`) per sub-domain rules; 3D / fields / trajectories → \`plotly_chart\` with non-empty \`data\`; printed regular polygons (if any) → \`geometry_json\`; function plots → \`python_plot\` with required fields or \`plotly_chart\`.
- **FORBIDDEN**: Reusing one parent-stem diagram for every sub when subs need different FBDs or circuits — adapt each row's payload to that sub's scenario.
- **Scoring JSON**: Do not alter \`setup\`, \`process\`, \`result\`, \`logic\`, \`max_points\`; \`visualization_code\` is auxiliary only.
`;
