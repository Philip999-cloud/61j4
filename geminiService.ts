
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { 
  LinguisticAudit, 
  SubjectExpertAnalysis, 
  ModeratorSynthesis, 
  SectionResult,
  ChineseTaskContent,
  GradingResults,
  Subject,
} from "./types";
import { StrategyFactory } from "./strategies/StrategyFactory";
import { allocateStemSubQuartetFromEarned } from "./utils/mathScoringUtils";
import { dedupeStemSubResultsBySubId } from "./utils/dedupeStemSubResults";
import { normalizePhase3StemSubResultsForDisplay } from "./utils/stemPhase3DisplayNormalize";
import { TEACH_FRAMEWORK_PROMPT } from "./utils/systemPrompt";

const STRICT_MATH_FORMAT_RULES = `You are an expert STEM tutor and a strict JSON API worker. Your outputs are rendered by KaTeX on the frontend. You MUST strictly adhere to the following LaTeX formatting rules to prevent parsing errors ("Math rendering failed"). Failure to follow these rules will crash the application.

1. **Strict Block Math for Tables/Arrays (CRITICAL)**: 
Any multi-line equation or alignment environment (e.g., \\begin{array}, \\begin{align}, \\begin{matrix}) MUST be enclosed in double dollar signs ($$) on their own lines. The $$ MUST be on a separate line, not mixed with other text. NEVER output raw \\begin{array} without $$ wrappers.

2. **Inline Math**: 
Variables, short formulas, or chemical formulas within text must be wrapped in single dollar signs ($). There MUST NOT be any spaces between the dollar signs and the formula content (Correct: $H_2O$, Incorrect: $ H_2O $).

3. **No Markdown inside LaTeX (CRITICAL)**: 
NEVER use Markdown formatting (like **bold** or *italic*) inside LaTeX math blocks ($$ or $). If you need bold text inside a formula, use LaTeX commands like \\mathbf{} or \\text{}. Keep Markdown asterisks outside the math blocks.

4. **Underscore and Subscript Protection**: 
In Markdown, underscores (_) can be misinterpreted as italics. Therefore, ANY content containing subscripts (like numbers in chemical formulas), Greek letters, or special symbols MUST be wrapped in $. NEVER leave strings with underscores (e.g., H_2O) exposed in regular text blocks.

5. **Real Newlines**: 
Do NOT output literal string "\\n" in general Markdown text. Use actual newlines (Carriage Return/Enter) for paragraph separation and formatting.

6. **Absolutely NO Color Tags**: 
Do NOT use \\color{...}, \\textcolor{...}, or any HTML/CSS styling. This causes unmatched brace (EOF) errors in KaTeX. Keep the LaTeX pure and unstyled.

7. **No Double Subscripts (CRITICAL)**: 
KaTeX will crash on double subscripts like SO_4^{2-}_{(aq)}. When adding state symbols like (aq), (s), (l), (g) to an ion, do NOT use a subscript if a subscript already exists. (e.g., use SO_4^{2-}(aq) or \\text{SO}_4^{2-}\\text{(aq)}).

8. **JSON String Double Escaping**: 
Because you are generating JSON strings, ALL LaTeX backslashes MUST be double-escaped. For example, output \\\\frac instead of \\frac, \\\\rightarrow instead of \\rightarrow.

9. **Perfectly Paired Delimiters (CRITICAL FOR \\left and \\right)**:
Every \\left command (e.g., \\left(, \\left[, \\left\\{) MUST have a precisely matching \\right command (e.g., \\right), \\right], \\right\\}) within the SAME formula block and the SAME line. Unmatched \\left or \\right will throw "Expected '\\right', got 'EOF'" errors. If you only need a bracket on one side, you MUST use the invisible delimiter "." on the other side (e.g., \\left. ... \\right|_{x=0}).`;

const CHEMISTRY_SUBJECTS = ['化學', 'Chemistry', '自然'];
const COMPOUNDS_SCHEMA_SUBJECTS = [
  '化學',
  'Chemistry',
  '自然',
  '物理',
  'Physics',
  '生物',
  '地球科學',
  '地科',
  'Biology',
  'Earth',
];

/** Pro 逾時或忙碌時改走較快模型（勿與下方 Pro 模型字串相同，否則 fallback 無效） */
const GEMINI_FLASH_FALLBACK_MODEL = 'gemini-3-flash-preview';

/** 數學甲 Phase 3 含多小題長詳解、一題多解與圖示；16k 易截斷 JSON，畫面只剩前段（約「三分之一」） */
const AST_MATH_A_PHASE3_SUBJECT_ID = 'ast-math-a';
/** 分科化學：compounds + 多解 + visualization；實測 finishReason=MAX_TOKENS @16k、stem_sub_results 異常膨脹（見 debug-1e3c30） */
const AST_CHEMISTRY_PHASE3_SUBJECT_ID = 'ast-chemistry';
/** 分科生物：與化學同樣套用 compounds schema + 必填 visualization_code／五段式，16k 易截斷致 JSON 不完整 */
const AST_BIOLOGY_PHASE3_SUBJECT_ID = 'ast-biology';
/** 分科物理：長 prompt（一題多解、五段式、3D plotly）16k 易 MAX_TOKENS 截斷，批改與圖示後段缺失 */
const AST_PHYSICS_PHASE3_SUBJECT_ID = 'ast-physics';
/** 學測自然科：IntegratedScience 強制每子題 visualization_code、五段式、CEEC 等，JSON 體積與分科理科同級；16k 易截斷致詳解不完整 */
const GSAT_SCIENCE_PHASE3_SUBJECT_ID = 'gsat-science';

const STEM_PHASE3_HIGH_OUTPUT_SUBJECT_IDS = new Set([
  AST_MATH_A_PHASE3_SUBJECT_ID,
  AST_CHEMISTRY_PHASE3_SUBJECT_ID,
  AST_BIOLOGY_PHASE3_SUBJECT_ID,
  AST_PHYSICS_PHASE3_SUBJECT_ID,
  GSAT_SCIENCE_PHASE3_SUBJECT_ID,
]);

function maxOutputTokensForStemPhase3(subjectId?: string): number {
  return subjectId && STEM_PHASE3_HIGH_OUTPUT_SUBJECT_IDS.has(subjectId) ? 65536 : 16384;
}

/**
 * 判斷是否為化學科目
 */
function isChemistrySubject(subjectName: string): boolean {
  return CHEMISTRY_SUBJECTS.some(k => subjectName.includes(k));
}

/** 與 StrategyFactory 數學科路由一致，避免誤套到其他科目 */
function isMathStemSubject(subjectName: string): boolean {
  const normalized = subjectName.toLowerCase();
  if (
    normalized.includes('數甲') ||
    normalized.includes('數學甲') ||
    normalized.includes('math a (ast)')
  ) {
    return true;
  }
  if (
    normalized.includes('數a') ||
    normalized.includes('數學a') ||
    normalized.includes('math a (gsat)')
  ) {
    return true;
  }
  if (
    normalized.includes('數b') ||
    normalized.includes('數學b') ||
    normalized.includes('math b')
  ) {
    return true;
  }
  return false;
}

const MATH_STEM_VIZ_APPENDIX = `

# MATH STEM — visualization_code（結構提醒，不改評分欄位）
每一個 stem_sub_results 項目必須包含 "visualization_code" 鍵：其值為 { "explanation": "...", "visualizations": [ ... ] } 或 null。
若小題涉及幾何、座標、函數圖形、向量、圓錐曲線、積分面積等**需要在介面上顯示的圖示**，不得以純文字描述代替圖形，且**嚴禁**使用 type "python_script" 或 Matplotlib 腳本充當圖形（前端不執行 Python，使用者只會看到錯誤提示）。
**題目影像中有印刷幾何圖（多邊形、塗色區、座標示意等）時，必須輸出 geometry_json（依科目策略之 topology／solver，欄位 code）或完整 svg_diagram（欄位 svgCode，完整 <svg>...</svg>）；禁止用空的或僅有標題的 plotly_chart 充當圖形。**
**圓錐曲線、含 xy 交叉項之旋轉橢圓、隱式二次曲線等**：必須用 **svg_diagram**（座標軸、虛線／實線橢圓、標記點與色碼）或 **plotly_chart**（例如多條 scatter mode "lines" 畫參數曲線、contour 畫 F(x,y)=c，關鍵點用 scatter mode "markers"；data 須可繪製，不可僅有 title）。
3D 空間幾何用 plotly_chart（data 須含可繪製的 traces）；平面顯式函數圖優先 python_plot（func_str、x_range、y_range 與現有沙箱一致）。若無法滿足 python_plot 必填欄位，改 plotly_chart 或 svg_diagram，**不要**改 output python_script。
visualizations[].type 可渲染者：**geometry_json、svg_diagram、plotly_chart、python_plot**。**不要**在 visualizations 內放入 python_script 作為題圖或解題示意圖。
純代數演算、無任何圖示需求時可將 visualization_code 設為 null。
嚴禁改動 setup、process、result、logic、max_points 的語意與加總規則；visualization_code 為獨立輔助欄位，不得刪減或取代評分 JSON 結構。
`;

/** 與 ResultsDisplay STEM 判斷對齊；通過者附加 T.E.A.C.H 框架（不影響國文／英文寫作等） */
function isStemSubjectForTeach(subjectName: string): boolean {
  const keys = [
    '數學', '數甲', '數A', '數B', '物理', '化學', '生物', '地球科學', '地科',
    '自然科', '跨科', '自然',
    'Calculus', 'Math', 'Science', 'Integrated',
  ];
  return keys.some((k) => subjectName.includes(k));
}

const TEACH_JSON_COMPAT_NOTE = `

# T.E.A.C.H 與 JSON 輸出相容（CRITICAL）
當本任務要求輸出「單一合法 JSON 物件」（主席綜評、stem_sub_results、標準詳解 schema 等）：頂層必須仍是可 JSON.parse 的結構，不得以純 Markdown 全文取代 JSON。請將 T.E.A.C.H. 五個區塊（標題與 Emoji 須與上文完全一致）寫入 remarks_zh、各 stem_sub_results 的 feedback、correct_calculation、zero_compression 內各字串欄位等敘述欄位（可合理分配於多欄，但五區塊皆須清楚可辨）。「動態情境路由」之批改判定（✅／⚠️／❌）置於該子題 feedback 或整卷 remarks_zh 開頭。JSON 字串內的 LaTeX 仍須雙跳脫反斜線。
`;

function buildSystemInstruction(baseInstruction: string, subjectName: string): string {
  let result = baseInstruction;
  if (isChemistrySubject(subjectName)) {
    result += `

# CHEMISTRY COMPOUND EXTRACTION（化學科強制規則，JSON Schema 優先）
你的 JSON 回覆**頂層**必須包含 "compounds" 陣列。
這個欄位是 schema 的一部分，不是可選的 explanation 欄位。

格式：
"compounds": [
  {
    "name": "PubChem 可查到的英文或繁體中文常用名（例如：硫酸 / sulfuric acid）",
    "formula": "化學式（例如：H2SO4）"
  }
]

抽取規則：
1. 從題目與學生作答中抽取所有「化合物」（不含單質如 Fe、Cu、Zn）。
2. 同一化合物只列一次（去重）。
3. 題目若完全沒有化合物，輸出空陣列 "compounds": []。
4. name 必須是 PubChem 能直接搜到的名稱，勿使用縮寫或俗稱。

⚠️ 若你忘記輸出 compounds，整個 JSON 將被視為格式錯誤。

# VISUALIZATION（圖表強制規則）
對於多質子酸滴定、沉澱平衡等有圖形價值的題目，
stem_sub_results 中相關的 sub 必須填入 visualization_code，
type 使用 "scatter" 繪製滴定曲線或 "mol3d" 展示分子結構。
若題目不需要圖形輔助，可設為 null。
`;
  }
  if (!isChemistrySubject(subjectName) && /生物|biology/i.test(subjectName)) {
    result += `

# BIOLOGY — 頂層 compounds（JSON Schema 對齊）
你的 JSON 回覆**頂層**必須包含 "compounds" 陣列（與化學科 schema 相同欄位）。
- 題目若涉及有機分子、代謝物、試劑等可填 name／formula／smiles；無任何化合物或僅單質時輸出空陣列 "compounds": []。
- 勿省略此鍵；省略將導致結構化輸出失敗。
`;
  }
  if (isMathStemSubject(subjectName)) {
    result += MATH_STEM_VIZ_APPENDIX;
  }
  if (needsNaturalScienceVizAppendix(subjectName)) {
    result += NATURAL_SCIENCE_VIZ_APPENDIX;
  }
  if (isStemSubjectForTeach(subjectName)) {
    result += `\n\n${TEACH_FRAMEWORK_PROMPT}${TEACH_JSON_COMPAT_NOTE}`;
  }
  return result;
}

function needsNaturalScienceVizAppendix(subjectName: string): boolean {
  const n = subjectName.toLowerCase();
  if (n.includes('化學') || n.includes('chemistry')) return false;
  return (
    n.includes('物理') ||
    n.includes('physics') ||
    n.includes('生物') ||
    n.includes('biology') ||
    n.includes('地球') ||
    n.includes('地科') ||
    n.includes('earth science') ||
    n.includes('自然') ||
    n.includes('跨科') ||
    n.includes('integrated science')
  );
}

const NATURAL_SCIENCE_VIZ_APPENDIX = `

# NATURAL SCIENCE (non–pure-chemistry) — visualization_code structured types
除了 svg_diagram、plotly_chart、python_plot、geometry_json、free_body_diagram 等既有類型外，可視題意使用下列 **type**（須提供可解析欄位；若無把握請改 svg_diagram 或 null）：
- "titration_curve": 欄位 x、y 為等長數值陣列（滴定／pH–體積曲線，不需 chart_kind）
- "circuit_schematic": "elements": [{ "kind":"battery"|"resistor"|"ammeter", "label"?, "value"? }] 串聯示意
- "chem_smiles_2d_lone_pairs": "smiles" 字串；可選 lone_pair_atom_indices（數字陣列）或 lone_pair_markers: [{ "x":0..1, "y":0..1, "count":1|2 }]
- "biology_punnett_square": "parent1_gametes"、"parent2_gametes" 字串陣列
- "biology_pedigree": "nodes":[{ "id", "gender"?: "male"|"female"|"unknown", "affected"?: boolean }], "edges":[{ "from", "to" }]
- "mermaid_flowchart": "definition" 為 Mermaid 流程圖語法字串（簡短）
- "earth_celestial_geometry": "moon_phase" 為 new|waxing_crescent|first_quarter|waxing_gibbous|full|waning_gibbous|last_quarter|waning_crescent 之一，或提供 "caption"
- "earth_contour_map": "isolines":[{ "points":[[x,y],...], "value"? }, ...]
- "energy_level_diagram": "levels":[{ "label","energy"? }]，至少兩階；可選 "transitions":[{ "from_index","to_index","label"? }]，及 "sort_by_energy"（預設 true）
- "periodic_table_highlight": "highlight_symbols":["Na","Cl",...]（1～2 字母元素符號，最多約 24 個）；可選 "title"
仍須遵守各策略對 raster 圖像之禁止規定；overlay 僅用向量 SVG。
`;

// Enhanced Retry Logic with Exponential Backoff
async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3, baseDelay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await ai.models.generateContent(params);
      return result;
    } catch (e: any) {
      lastError = e;

      const status = e.status || e.code || e.error?.code || e.response?.status;
      const message = (e.message || e.error?.message || JSON.stringify(e) || '').toString();

      // 0. API 密鑰或模型錯誤：立即拋出，讓外層得知具體原因
      const errMsgLower = message.toLowerCase();
      if (
        status === 401 ||
        status === 403 ||
        (errMsgLower.includes('invalid') && (errMsgLower.includes('api') || errMsgLower.includes('key'))) ||
        errMsgLower.includes('api_key_invalid') ||
        errMsgLower.includes('api key not valid')
      ) {
        console.error('Gemini API Error Details:', e);
        throw new Error('API 密鑰無效或已過期，請檢查 .env 中的 VITE_GEMINI_API_KEY 設定。');
      }
      if (
        status === 404 ||
        errMsgLower.includes('model_not_found') ||
        (errMsgLower.includes('model') && errMsgLower.includes('not found'))
      ) {
        console.error('Gemini API Error Details:', e);
        throw new Error('指定的模型不存在或無法使用，請檢查模型名稱。');
      }

      // 1. Handle Fatal Client Errors (400)
      if (status === 400 || (message && message.includes('INVALID_ARGUMENT'))) {
         console.error("Gemini API Fatal Error (400):", e);
         throw new Error("請求內容無效 (Invalid Argument)。可能是圖片檔案過大、格式不支援或內容為空。");
      }

      // 2. Identify Transient/Server Errors
      const isTransient = 
        status === 503 || 
        status === 500 || 
        status === 429 || 
        errMsgLower.includes('failed to fetch') ||
        (message && (
            message.includes('overloaded') || 
            message.includes('503') || 
            message.includes('high demand') || 
            message.includes('capacity') ||
            message.includes('UNAVAILABLE') ||
            message.includes('timeout') ||
            message.includes('internal error') ||
            message.includes('fetch failed')
        ));
      
      // 3. Exponential Backoff（暫態錯誤不重複 console.error，避免批改流程洗版）
      if (isTransient && i < retries - 1) {
        if (import.meta.env.DEV) {
          console.debug(`[Gemini API] transient (attempt ${i + 1}/${retries}):`, status ?? message);
        }
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 500); // Add jitter
        console.warn(`Gemini API Transient Error (${status}). Retrying in ${Math.round(delay)}ms... (Attempt ${i+1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error('Gemini API Error Details:', e);
      break;
    }
  }
  
  // Use warn instead of error to avoid polluting console if fallback exists
  console.warn("Gemini API Failed after retries:", lastError);
  let finalMsg = lastError?.message || lastError?.error?.message || "AI 服務暫時無法使用，請稍後再試 (Service Unavailable)。";
  
  // 針對 ERR_INTERNET_DISCONNECTED (Failed to fetch) 提供友善的繁體中文提示
  if (finalMsg.toLowerCase().includes('failed to fetch')) {
    finalMsg = "網路連線中斷或不穩定，無法連線至 AI 伺服器。請檢查您的 Wi-Fi 或行動網路狀態後再試一次。";
  }
  
  throw new Error(finalMsg);
}

/**
 * 根據 prompt 長度動態計算 Pro 模型的等待上限（主席綜評／詳解會再與下限取 max）。
 * 化學長 JSON schema、多圖多模態易觸及先前 150s 上限而誤降級 Flash，故拉長分段等待。
 */
function getProTimeoutMs(prompt: string): number {
  const len = typeof prompt === 'string' ? prompt.length : JSON.stringify(prompt).length;
  if (len > 4000) return 360000; // 360 秒：STEM 高輸出科目（生物／物理／化學）需要較長時間
  if (len > 2000) return 240000; // 240 秒
  return 150000; // 150 秒
}

/**
 * 帶 timeout 的 Promise race wrapper。
 * timeoutMs 後自動 reject，觸發外層 catch → fallback to Flash。
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Pro model timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([promise, timer]);
}

/** 模型常複製提示詞裡的 JS 風格註解（非合法 JSON）；於解析前剔除以降低「Colon expected」類錯誤 */
function stripEchoedJsCommentsFromModelJson(s: string): string {
  return s
    .replace(/\s*\/\/\s*👈[^\n\r]*/g, '')
    .replace(/\s*\/\/\s*visualization_code[^\n\r]*/gi, '');
}

// Enhanced JSON Parsing with Multi-Stage Recovery
function safeJsonParse(text: string | null | undefined): any {
  if (!text) return null;
  
  // 1. Clean Markdown Code Blocks
  let cleaned = text.replace(/^```(?:json)?|```$/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '').trim();
  cleaned = stripEchoedJsCommentsFromModelJson(cleaned);

  // Fix common LaTeX commands that start with valid JSON escape characters (b, f, n, r, t)
  // If the AI outputs \begin instead of \\begin, JSON.parse would silently convert \b to backspace.
  cleaned = cleaned
    .replace(/(?<!\\)\\begin/g, "\\\\begin")
    .replace(/(?<!\\)\\end/g, "\\\\end")
    .replace(/(?<!\\)\\frac/g, "\\\\frac")
    .replace(/(?<!\\)\\text/g, "\\\\text")
    .replace(/(?<!\\)\\right/g, "\\\\right")
    .replace(/(?<!\\)\\left/g, "\\\\left")
    .replace(/(?<!\\)\\nu/g, "\\\\nu")
    .replace(/(?<!\\)\\beta/g, "\\\\beta")
    .replace(/(?<!\\)\\times/g, "\\\\times")
    .replace(/(?<!\\)\\rightarrow/g, "\\\\rightarrow")
    .replace(/(?<!\\)\\Rightarrow/g, "\\\\Rightarrow")
    .replace(/(?<!\\)\\textbf/g, "\\\\textbf")
    .replace(/(?<!\\)\\textit/g, "\\\\textit");

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    try {
      // 2. Try replacing literal newlines with spaces (common AI JSON error)
      let noNewlines = cleaned.replace(/\n/g, " ").replace(/\r/g, "");
      return JSON.parse(noNewlines);
    } catch (e2) {
      try {
        // 3. Fix unescaped backslashes (e.g. \alpha instead of \\alpha)
        // Only replace \ if it's not preceded by \ and not followed by a valid JSON escape char
        let processing = cleaned
          .replace(/\n/g, " ")
          .replace(/\r/g, "")
          .replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, "\\\\");
        return JSON.parse(processing);
      } catch (e3) {
        try {
          const repaired = jsonrepair(cleaned);
          return JSON.parse(repaired);
        } catch (e4) {
          try {
            const repaired2 = jsonrepair(
              cleaned.replace(/\n/g, " ").replace(/\r/g, "").replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, "\\\\")
            );
            return JSON.parse(repaired2);
          } catch (e5) {
            console.error("JSON Parse 最終失敗", e5);
            // #region agent log
            {
              const posMatch = String((e5 as Error)?.message || '').match(/position\s+(\d+)/i);
              const pos = posMatch ? parseInt(posMatch[1], 10) : NaN;
              const start = Number.isFinite(pos) ? Math.max(0, pos - 40) : 300;
              const end = Number.isFinite(pos) ? pos + 40 : 380;
              fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7b5019'},body:JSON.stringify({sessionId:'7b5019',runId:'pre-fix',hypothesisId:'H1-H3',location:'geminiService.ts:safeJsonParse:finalFail',message:'safeJsonParse final failure',data:{errMsg:String((e5 as Error)?.message||e5),textLen:cleaned.length,sliceAround:cleaned.slice(start,end),hasDoubleSlashComment:/\/\/\s*👈/.test(cleaned),hasVizLineComment:/\/\/\s*visualization_code/i.test(cleaned)},timestamp:Date.now()})}).catch(()=>{});
            }
            // #endregion
            return null;
          }
        }
      }
    }
  }
}

const STEM_KEYWORDS = ['數學', '物理', '化學', '生物', '自然', 'Math', 'Physics', 'Chemistry', 'Biology', 'Science', '數甲', '數A', '數B'];

/** 標準批改流程中，學生手寫作答應使用 STEM／LaTeX 轉錄提示詞的科目（排除純語文作文） */
const STEM_STUDENT_TRANSCRIPTION_SUBJECT_IDS = new Set([
  'gsat-math-a',
  'gsat-math-b',
  'gsat-science',
  'ast-math-a',
  'ast-physics',
  'ast-chemistry',
  'ast-biology',
]);

export function subjectUsesStemStudentTranscription(subject: Pick<Subject, 'id' | 'name'> | null | undefined): boolean {
  if (!subject?.id) return false;
  return STEM_STUDENT_TRANSCRIPTION_SUBJECT_IDS.has(subject.id);
}

function isChemistrySubjectForTranscription(subject: Pick<Subject, 'id' | 'name'> | null | undefined): boolean {
  if (!subject) return false;
  if (subject.id === 'ast-chemistry') return true;
  const n = (subject.name || '').toLowerCase();
  return subject.name.includes('化學') || n.includes('chemistry');
}

const STEM_STUDENT_ANSWER_OCR_PROMPT = `
Role: Professional OCR Specialist for handwritten STEM exam answers (Traditional Chinese context).
Task: Transcribe the student's handwritten answer image into text that will be rendered with KaTeX on the web.

**CRITICAL — Math and science notation (must follow):**
1. **LaTeX delimiters**: Wrap every equation, formula, chemical expression, and standalone numeric relation in LaTeX.
   - Short expressions inline: single dollar signs, no spaces inside (e.g. $H_2SO_4$, $10^{-3}$, $K_{sp}$).
   - Multi-line structures (ICE tables, aligned steps, matrices): use block math with $$ on their own lines before and after the environment.
2. **No Markdown tables**: Do NOT use pipe tables (| ... |) or ASCII-only column alignment for stoichiometry / ICE. For initial–change–equilibrium or mole tables you MUST use a LaTeX block:
   $$\\begin{array}{...} ... \\end{array}$$
   with \\\\ between rows and & between columns; column specifiers must match the number of columns.
3. **Chemistry (when formulas appear)**: Prefer mhchem inside math: $\\ce{...}$ for species and reactions (e.g. $\\ce{BaSO4}$, $\\ce{SO4^2-}$, $\\ce{Ba^{2+}}$). Subscripts/superscripts for ions and scientific notation must live inside math mode.
4. **Arrows and symbols**: Use LaTeX where appropriate (e.g. $\\rightarrow$, $\\rightleftharpoons$, $\\Rightarrow$, $\\therefore$) instead of relying on raw Unicode layout for mixed math.
5. **Prose in Chinese**: Explanatory sentences may remain in 繁體中文 outside math; embed formulas in $...$ or $$...$$ as above.
6. **Faithfulness**: Transcribe the student's final intended work; omit crossed-out or clearly deleted lines. Preserve meaningful line breaks between derivation steps.
7. **Output**: Return ONLY the transcribed string. No preamble or commentary.
`.trim();

const STEM_STUDENT_ANSWER_CHEMISTRY_ADDENDUM = `
**Chemistry-specific:** For equilibrium / solubility / titration calculations, stoichiometry rows MUST appear inside a single $$\\begin{array}...\\end{array}$$ block when the student drew a table or aligned numbers — never as loose spaced numbers only.
`.trim();

/** 與 transcribeHandwrittenImages 內 data URL 解析邏輯一致（供 Phase 3 多模態附圖） */
function dataUrlToInlinePart(dataUrl: string): { inlineData: { mimeType: string; data: string } } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    let mimeType = matches[1];
    if (mimeType === 'application/octet-stream') {
      mimeType = 'image/jpeg';
    }
    return { inlineData: { mimeType, data: matches[2] } };
  }
  return { inlineData: { mimeType: 'image/jpeg', data: dataUrl.split(',')[1] || dataUrl } };
}

/**
 * 數學 A／數學甲／數學 B／物理：Phase 3／標準詳解多模態附圖 + 題目圖 OCR 圖形詳述。
 * 新增科目 id 時請同步更新 components/GradingWorkflow.tsx 的 GEOMETRY_PREFETCH_SUBJECT_IDS。
 */
const MATH_VISION_PHASE3_SUBJECT_IDS = new Set([
  'ast-math-a',
  'gsat-math-a',
  'gsat-math-b',
  'ast-physics',
  'ast-chemistry',
]);

export type ModeratorVisionImages = {
  question?: string[];
  reference?: string[];
  student?: string[];
};

export async function transcribeHandwrittenImages(
  images: string[],
  mode: 'question' | 'answer' = 'answer',
  isVisualGraphingTask: boolean = false,
  subject?: Pick<Subject, 'id' | 'name'> | null,
): Promise<string> {
  if (!images || images.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H3',location:'geminiService.ts:transcribeHandwrittenImages',message:'empty images array',data:{mode,subjectId:subject?.id??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return "";
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // #region agent log
  const first = images[0] ? String(images[0]) : '';
  fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H1-H3',location:'geminiService.ts:transcribeHandwrittenImages:entry',message:'transcribe start',data:{mode,subjectId:subject?.id??null,imageCount:images.length,firstUrlPrefix:first.slice(0,48),looksLikeDataUrl:first.startsWith('data:')},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  
  // 動態解析 Data URL
  const parts: any[] = images.map(dataUrl => {
    // 使用正則表達式解析 mimeType 與 base64 資料
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      let mimeType = matches[1];
      // Gemini API 不支援 application/octet-stream，強制轉為 image/jpeg
      if (mimeType === 'application/octet-stream') {
        mimeType = 'image/jpeg';
      }
      return {
        inlineData: {
          mimeType: mimeType, // 動態取得原始圖片的格式 (如 image/png)
          data: matches[2]      // 純 Base64 資料
        }
      };
    }
    // Fallback 如果格式不符
    return { inlineData: { mimeType: 'image/jpeg', data: dataUrl.split(',')[1] || dataUrl } };
  });

  if (isVisualGraphingTask) {
    const prompt = `
      請扮演視覺評分員 (Visual Grader) 專門處理自然科作圖題。
      這是一張學生的作圖題作答影像。請直接進行視覺分析，判斷圖形特徵（如：座標軸標示、曲線趨勢、截距、斜率、力圖向量方向等）。
      請將你觀察到的視覺特徵與結論，轉換為詳細的文字描述，以便後續的評分模型進行邏輯判斷。
      請注意：你不需要給出分數，只需要客觀描述圖形內容。
    `;
    parts.push({ text: prompt });
    try {
      const result = await generateContentWithRetry(ai, {
        model: 'gemini-3.1-pro-preview', // Use highest vision model for visual tasks
        contents: { parts }
      }, 3, 2000);
      const t = result.text || "";
      // #region agent log
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H1',location:'geminiService.ts:transcribeHandwrittenImages:visualExit',message:'visual task result',data:{outLen:t.length,outPreview:t.slice(0,280)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return t;
    } catch (e) {
      console.warn("Visual Graphing Task failed, returning empty string.", e);
      // #region agent log
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H4',location:'geminiService.ts:transcribeHandwrittenImages:visualCatch',message:'visual task failed',data:{err:String((e as Error)?.message||e)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return "";
    }
  }
  
  let prompt = "";
  if (mode === 'question') {
    const mathFigureAddendum =
      subject?.id && MATH_VISION_PHASE3_SUBJECT_IDS.has(subject.id)
        ? `
      6. **圖形與塗色區 — 可重繪級描述（數學 A／數學甲／數學 B，CRITICAL）**  
         在完整抄錄題幹印刷文字之後，另起「【圖形描述】」，目標是讓後續**依文字重繪的示意圖**在**點線連接關係、相對方位、塗色區邊界**上與原圖**盡量一致**；僅寫可見事實，但**資訊量要足以定出拓扑與相對位置**。
         **忠實度**：
         - **禁止臆測**：不得新增圖中未畫出的線、點、塗色邊界；不得捏造題目未給的邊長／角度數值。
         - **不確定須標示**：無法唯一判定的交點或邊界，寫「無法從圖中唯一判定」並列出可見的兩種以上可能。
         - **代號一致**：圖上無標記時，自訂點名（建議：外框頂點依**順時針**由**最上端或最左端之頂點**起編 V1,V2,…；中心 O；交點 P1,P2,…），**全文同一套代號**。
         **必須依下列小標分段輸出（有圖幾何時不可省略；若某段不適用請寫「無」並說明）**：
         - **6a【外框與定向】**：外框類型（如正六邊形）；在畫面中的**定向**（例如「一頂點朝上、底邊大致水平」「一組對邊呈水平」）；與畫面邊緣的相對關係（置中／偏某側）。
         - **6b【點位清單】**：列出**每一個**在圖中扮演角色的點：外框頂點、中心、線段交點、塗色區角點。每一點用**一條編號列**寫明：(1) 代號 (2) 類型 (3) **相對位置**：至少一句以**圖心 O** 或**某一外框頂點**為參考的方位（正上／右上／正左／…），若該點在某線段上須寫「落在線段 Vi–Vj 上（或介於兩端之間／與端點重合）」；(4) 若為兩線交點，寫「直線(或線段) Va–Vb 與 Vc–Vd 的交點」。
         - **6c【邊線清單】**：逐條列出**圖中畫出的**線段（含外框邊與內部對角線／弦），格式「邊k：端點 Vi–Vj；肉眼可辨方向（水平／鉛直／斜向）；是否通過 O」。
         - **6d【交點清單】**：凡內部線段彼此相交處，逐條寫「交點 Pm：邊 a 與邊 b 相交；Pm 相對 O 或相對最近外框頂點的方位」。
         - **6e【點對相對位置（重繪用）】**：對**塗色區頂點**與**中心 O**，任取兩點 A、B，若圖中可辨，補一句「A 在 B 的哪一方位（如東北、正下方）」；至少覆蓋塗色區邊界上**相鄰頂點對**與「各頂點—O」的關係。
         - **6f【塗色區】**：塗色封閉區域；邊界須給**封閉頂點環**（明訂順時針或逆時針）如 V1→O→P2→P1→V1；並說明該區在整圖中的位置（如「中心左側」「上半兩三角形之一」等可見描述）。
         - **6g【對稱與特殊線】**：若存在明顯對稱軸、過中心的直徑、水平／鉛直中線，逐條指出由哪些點連成。
         - **6h【函數／座標圖】**（若適用）：軸名與正方向、可讀刻度、曲線與區域邊界。
         - **6i【與題幹數字】**：題目數值對應哪個整體圖形（如整個正六邊形面積），不要求計算塗色面積。
         **6j【相對座標草模（選用，非題目條件）】**：若外框為**正多邊形**且無印刷座標，可另起一段並**開頭聲明**「以下僅為重繪用假設座標，假設中心為原點、某一可見頂點在正上方，外接半徑取 1」；列出各點的**近似極角或象限＋相鄰關係**，且**不得與 6b–6f 的拓扑矛盾**。若無法安全給出則整段省略。
         禁止只輸出題幹一句；有非平凡幾何時，**【圖形描述】總長須足以讓人不重看原圖也能畫出等拓扑草圖**。
    `
        : '';
    prompt = `
      Role: Professional OCR Specialist (Chinese & STEM).
      Task: Transcribe the exam question image into text.
      
      Strict Rules:
      1. **Transcription Accuracy**: Output the text EXACTLY as seen.
      2. **Score Extraction**: If the text contains score allocation (e.g., "(1) 占4分"), you MUST transcribe it accurately. This is critical for grading.
      3. **Math/Science**: Use LaTeX format for all formulas (wrapped in $$).
      4. **Structure**: Preserve question numbers (1, 2, (1), (2)) and option lists (A, B, C, D).
      5. **Language**: Primarily Traditional Chinese (繁體中文).
      ${mathFigureAddendum}
    `;
  } else if (mode === 'answer' && subjectUsesStemStudentTranscription(subject)) {
    prompt =
      STEM_STUDENT_ANSWER_OCR_PROMPT +
      (isChemistrySubjectForTranscription(subject) ? `\n\n${STEM_STUDENT_ANSWER_CHEMISTRY_ADDENDUM}` : '');
  } else {
    // Optimized for Chinese / English composition handwriting (non-STEM standard subjects)
    prompt = `
      Role: Expert Traditional Chinese Handwriting Recognizer (繁體中文手寫辨識專家).
      Task: Transcribe the student's handwritten essay image into pure text.
      
      **CRITICAL OPTIMIZATION RULES:**
      1. **Context-Aware Correction**: If a character is scribbled, cursive, or ambiguous, use the sentence context to identify the correct Traditional Chinese character.
      2. **Ignore Deletions**: Do NOT transcribe crossed-out text, scribble marks, or correction tape marks. Only transcribe the final intended text.
      3. **Formatting**: Preserve paragraph breaks (newlines). Do not add artificial numbering unless present in the image.
      4. **Punctuation**: Transcribe punctuation marks correctly (，。、！？：「」).
      5. **Mixed Layout**: Handle both horizontal and vertical writing styles automatically.
      6. **Output**: Return ONLY the transcribed text string. No conversational filler.
    `;
  }
  parts.push({ text: prompt });

  try {
    const result = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-pro-preview',
      contents: { parts }
    }, 3, 2000);
    const t = result.text || "";
    // #region agent log
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H1',location:'geminiService.ts:transcribeHandwrittenImages:ocrOk',message:'ocr result',data:{mode,subjectId:subject?.id??null,outLen:t.length,outPreview:t.slice(0,320)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return t;
  } catch (e) {
    console.warn('OCR (gemini-3.1-pro-preview) failed, retrying...', e);
    // #region agent log
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H4',location:'geminiService.ts:transcribeHandwrittenImages:ocrRetry',message:'ocr first attempt failed',data:{mode,err:String((e as Error)?.message||e)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const result = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-pro-preview',
      contents: { parts }
    }, 2, 2000);
    const t2 = result.text || "";
    // #region agent log
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H1',location:'geminiService.ts:transcribeHandwrittenImages:ocrRetryOk',message:'ocr after retry',data:{mode,outLen:t2.length,outPreview:t2.slice(0,320)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return t2;
  }
}

/**
 * 將分類模型回傳對齊為內部學科標籤（與 StrategyFactory、題名「自然科 (…)」一致）。
 * 先前僅接受完全相等字串，模型若回傳「物理。」或「【物理】」會誤判為綜合自然 → 誤套 IntegratedScienceStrategy，物理批改規則不生效。
 */
function parseScienceClassification(raw: string): string {
  const text = (raw || '').trim();
  if (!text) return '自然';

  const labels = ['物理', '化學', '生物', '地球科學', '綜合自然'] as const;
  for (const label of labels) {
    if (text === label) return label === '綜合自然' ? '自然' : label;
  }

  const inner = text
    .replace(/^[\s【】\[\]()（）「」'".,，。、：:]+|[\s【】\[\]()（）「」'".,，。、：]+$/g, '')
    .trim();
  for (const label of labels) {
    if (inner === label || inner.startsWith(label)) return label === '綜合自然' ? '自然' : label;
  }

  const c = text.replace(/\s/g, '');
  if (c.includes('綜合自然') || c.includes('综合自然')) return '自然';
  if (c.includes('地球科學')) return '地球科學';
  if (c.includes('地科')) return '地球科學';
  if (c.includes('化學')) return '化學';
  if (c.includes('生物')) return '生物';
  if (c.includes('物理')) return '物理';

  return '自然';
}

export async function classifyScienceSubject(qText: string, rText: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Role: 高中自然科教師。
    Task: 請分析以下學測題目的內容，判斷它屬於哪一個子學科。
    選項：【物理】、【化學】、【生物】、【地球科學】、【綜合自然】。
    
    題目內容：${qText}
    參考解答：${rText}
    
    請「只」輸出上述五個選項中的其中一個詞彙，不要有任何其他標點符號或解釋。
  `;

  try {
    const result = await generateContentWithRetry(
      ai,
      {
        model: GEMINI_FLASH_FALLBACK_MODEL,
        contents: prompt,
        config: { temperature: 0.1 },
      },
      2,
      1000
    );

    return parseScienceClassification(result.text || '');
  } catch (e) {
    console.warn('分類自然科失敗，降級為綜合自然', e);
    return '自然';
  }
}

export async function transcribeChineseGroup(q: string[], r: string[], s: string[] | string): Promise<ChineseTaskContent> {
  const [qt, rt, st] = await Promise.all([
    transcribeHandwrittenImages(q, 'question'), 
    transcribeHandwrittenImages(r, 'question'), 
    typeof s === 'string' ? Promise.resolve(s) : transcribeHandwrittenImages(s, 'answer') 
  ]);
  return { question: qt, reference: rt, student: st };
}

// We use JSON Schema enforcement here for robust parsing
export async function runLinguisticAudit(content: string, subjectName: string, instructions: string): Promise<LinguisticAudit> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Role: Linguistic Auditor (Phase 1). Subject: ${subjectName}. Instructions: ${instructions}. Analyze structural integrity. Content: ${content}`;
  
  const result = await generateContentWithRetry(ai, {
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: { 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                technical_proficiency_score: { type: Type.NUMBER },
                grammatical_observations: { type: Type.ARRAY, items: { type: Type.STRING } },
                word_count: { type: Type.NUMBER },
                basic_syntax_check: { type: Type.STRING }
            }
        }
    }
  }, 4, 2000); // 4 Retries for Flash to ensure foundation
  return safeJsonParse(result.text);
}

export async function runSubjectExpertAnalysis(content: string, subjectName: string, instructions: string): Promise<SubjectExpertAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Role: Subject Matter Expert (Phase 2). Subject: ${subjectName}. Instructions: ${instructions}. Analyze depth and reasoning. Content: ${content}`;
  
  const result = await generateContentWithRetry(ai, {
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: { 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                qualitative_merit_score: { type: Type.NUMBER },
                reasoning_critique: { type: Type.STRING },
                critical_thinking_level: { type: Type.STRING }
            }
        }
    }
  }, 4, 2000); // 4 Retries for Flash
  return safeJsonParse(result.text);
}

/** Phase3 物理：模型常漏回 stem_sub 四分項（日誌為 undefined），改由 final_score × 配分權重回填 */
function coerceModeratorFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim().replace(/[\uFF10-\uFF19]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
    );
    const m = t.match(/-?[0-9]+(\.[0-9]+)?/);
    if (m) return parseFloat(m[0]);
  }
  return undefined;
}

function stemPhysicsQuartetUnset(sub: Record<string, unknown>): boolean {
  return (['setup', 'process', 'result', 'logic'] as const).every((k) => {
    const v = sub[k];
    return !(typeof v === 'number' && Number.isFinite(v));
  });
}

function normalizePhysicsStemSubScoresFromModerator(parsed: Record<string, unknown>) {
  const stems = parsed.stem_sub_results;
  if (!Array.isArray(stems) || stems.length === 0) return;

  const unsetIdx = stems
    .map((s, i) => (stemPhysicsQuartetUnset(s as Record<string, unknown>) ? i : -1))
    .filter((i) => i >= 0);
  if (unsetIdx.length === 0) return;

  const finalScore =
    coerceModeratorFiniteNumber(parsed.final_score) ??
    coerceModeratorFiniteNumber((parsed.ceec_results as { total_score?: unknown } | undefined)?.total_score);
  if (finalScore === undefined || finalScore < 0) return;

  const maxFor = (s: Record<string, unknown>) => coerceModeratorFiniteNumber(s.max_points) ?? 5;
  const totalMaxAll = stems.reduce((acc, s) => acc + maxFor(s as Record<string, unknown>), 0);
  if (totalMaxAll <= 0) return;

  const unsetMaxSum = unsetIdx.reduce((acc, i) => acc + maxFor(stems[i] as Record<string, unknown>), 0);
  const earnedBudget = Math.round(finalScore * (unsetMaxSum / totalMaxAll) * 2) / 2;

  let pool = earnedBudget;
  unsetIdx.forEach((idx, j) => {
    const sub = stems[idx] as Record<string, unknown>;
    const wi = maxFor(sub);
    let part =
      j === unsetIdx.length - 1 ? pool : Math.round((earnedBudget * wi) / unsetMaxSum * 2) / 2;
    if (part < 0) part = 0;
    if (part > pool) part = pool;
    pool -= part;

    const q = allocateStemSubQuartetFromEarned(part, sub.max_points);
    sub.setup = q.setup;
    sub.process = q.process;
    sub.result = q.result;
    sub.logic = q.logic;
  });
}

export async function runModeratorSynthesis(
  content: string,
  subjectName: string,
  audit: LinguisticAudit,
  expert: SubjectExpertAnalysis,
  instructions: string,
  subjectId?: string,
  visionImages?: ModeratorVisionImages
): Promise<ModeratorSynthesis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const strategy = StrategyFactory.getStrategy(subjectName);
  
  let prompt: string;
  let systemInstruction = STRICT_MATH_FORMAT_RULES;

  if (strategy.getSystemPrompt) {
    systemInstruction = strategy.getSystemPrompt();
    // 若策略同時定義了 generatePrompt，使用它產生更精準的 user prompt（如 BiologyStrategy）
    if (strategy.generatePrompt) {
      prompt = strategy.generatePrompt(content, audit, expert, instructions);
    } else {
      prompt = `
      Please grade the following student response based on the provided audit and expert analysis.
      
      Student Content: ${content}
      Linguistic Audit: ${JSON.stringify(audit)}
      Subject Expert Analysis: ${JSON.stringify(expert)}
      Additional Instructions: ${instructions || 'None'}
    `.trim();
    }
  } else {
    prompt = strategy.generatePrompt!(content, audit, expert, instructions);
  }

  const visionPrefix =
    '【多模態參考影像】以下依序為：(1) 題目圖片 (2) 詳解／參考圖片 (3) 學生作答圖片。各區塊可能含多張圖，請與下方 OCR／轉錄文字互相對照。\n\n';
  const hasVisionUrls =
    !!visionImages &&
    ((visionImages.question?.length ?? 0) > 0 ||
      (visionImages.reference?.length ?? 0) > 0 ||
      (visionImages.student?.length ?? 0) > 0);
  const useMultimodal =
    !!subjectId &&
    MATH_VISION_PHASE3_SUBJECT_IDS.has(subjectId) &&
    hasVisionUrls;

  let contents: string | { parts: any[] };
  if (useMultimodal && visionImages) {
    const parts: any[] = [];
    const pushNonEmpty = (urls: string[] | undefined) => {
      if (!urls) return;
      for (const u of urls) {
        if (u && String(u).trim()) parts.push(dataUrlToInlinePart(u));
      }
    };
    pushNonEmpty(visionImages.question);
    pushNonEmpty(visionImages.reference);
    pushNonEmpty(visionImages.student);
    parts.push({ text: visionPrefix + prompt });
    contents = { parts };
  } else {
    contents = prompt;
  }

  const promptForTimeout =
    typeof contents === 'string' ? contents : visionPrefix + prompt;

  // #region agent log
  const inlinePartCount =
    typeof contents === 'object' && contents && 'parts' in contents
      ? Math.max(0, (contents as { parts: unknown[] }).parts.length - 1)
      : 0;
  fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'pre',hypothesisId:'H2',location:'geminiService.ts:runModeratorSynthesis:contents',message:'phase3 payload shape',data:{subjectId:subjectId??null,subjectName,useMultimodal,hasVisionUrls,inlinePartCount,contentLen:content.length,contentPreview:content.slice(0,400)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  /** 與物理相同：compounds schema 下若未標 required，Flash 常省略 max_points／feedback，致 UI 出現 MAX「—」與閱卷點評空白（見生物 Q48） */
  const stemSubItemStemGradeRequired =
    /物理|physics/i.test(subjectName) || /生物|biology/i.test(subjectName);

  const baseConfig = {
    responseMimeType: "application/json" as const,
    systemInstruction: buildSystemInstruction(systemInstruction, subjectName),
    temperature: 0.2,
    /** 化學／物理 compounds + stem_sub_results 體積大；數學甲、分科化學／生物／物理見 maxOutputTokensForStemPhase3（65536） */
    maxOutputTokens: maxOutputTokensForStemPhase3(subjectId),
    ...(COMPOUNDS_SCHEMA_SUBJECTS.some(k => subjectName.includes(k)) && {
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          final_score: { type: Type.NUMBER },
          max_score: { type: Type.NUMBER },
          remarks_zh: { type: Type.STRING },
          growth_roadmap: { type: Type.ARRAY, items: { type: Type.STRING } },
          detailed_fixes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                refined: { type: Type.STRING },
                logic: { type: Type.STRING },
              },
            },
          },
          stem_sub_results: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              ...(stemSubItemStemGradeRequired
                ? { required: ['sub_id', 'setup', 'process', 'result', 'logic', 'max_points', 'feedback'] }
                : {}),
              properties: {
                sub_id: { type: Type.STRING },
                sub_stem_discipline: {
                  type: Type.STRING,
                  nullable: true,
                  description:
                    '學測自然科專用：本子題學門 physics|chemistry|biology|earth|integrated',
                },
                key_molecules_smiles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '該小題重要分子之 SMILES；無則 []',
                },
                setup: { type: Type.NUMBER },
                process: { type: Type.NUMBER },
                result: { type: Type.NUMBER },
                logic: { type: Type.NUMBER },
                max_points: { type: Type.NUMBER },
                feedback: { type: Type.STRING },
                correct_calculation: { type: Type.STRING },
                concept_correction: { type: Type.STRING, nullable: true },
                alternative_solutions: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                alternative_methods: {
                  type: Type.ARRAY,
                  nullable: true,
                  description:
                    '化學等科一題多解結構化：每物件為一獨立解法，含 method_name、description、steps 字串陣列',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      method_name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                  },
                },
                knowledge_tags: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                scientific_notation_and_units: { type: Type.STRING, nullable: true },
                internal_verification: { type: Type.STRING, nullable: true },
                zero_compression: {
                  type: Type.OBJECT,
                  nullable: true,
                  description:
                    '五段式零跳步詳解（繁中＋LaTeX 雙跳脫）；無則 null',
                  properties: {
                    given: { type: Type.STRING },
                    formula: { type: Type.STRING },
                    substitute: { type: Type.STRING },
                    derive: { type: Type.STRING },
                    answer: { type: Type.STRING },
                  },
                },
                ceec_answer_sheet: {
                  type: Type.OBJECT,
                  nullable: true,
                  description:
                    '擬真大考作答區：矩陣勾選表、申論欄、選擇題或虛線列；不適用則 null',
                  properties: {
                    mode: {
                      type: Type.STRING,
                      description: 'mcq | fill | short | mixed',
                    },
                    line_count: { type: Type.NUMBER, nullable: true },
                    lines_per_response_field: { type: Type.NUMBER, nullable: true },
                    response_field_labels: {
                      type: Type.ARRAY,
                      nullable: true,
                      items: { type: Type.STRING },
                    },
                    answer_grid: {
                      type: Type.OBJECT,
                      nullable: true,
                      properties: {
                        row_labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                        col_labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                        solution_checks_per_row: {
                          type: Type.ARRAY,
                          nullable: true,
                          items: { type: Type.NUMBER, nullable: true },
                        },
                      },
                    },
                    mcq: {
                      type: Type.OBJECT,
                      nullable: true,
                      properties: {
                        mode: {
                          type: Type.STRING,
                          description: 'single | multi',
                        },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        correct_indices: {
                          type: Type.ARRAY,
                          items: { type: Type.NUMBER },
                        },
                      },
                    },
                  },
                },
                micro_lesson: {
                  type: Type.OBJECT,
                  nullable: true,
                  description:
                    'Phase 4 圖像式微課程（教學補充卡）；不適用則 null。欄位依 variant 取捨：oxidation_timeline 需 steps；color_oscillation 需 color_from/color_to（僅 #RRGGBB）；coordination_multiply 需 bidentate_count，teeth_per_ligand 可選預設 2。',
                  properties: {
                    variant: {
                      type: Type.STRING,
                      description:
                        'oxidation_timeline | color_oscillation | coordination_multiply',
                    },
                    title: { type: Type.STRING, nullable: true },
                    caption: { type: Type.STRING, nullable: true },
                    steps: {
                      type: Type.ARRAY,
                      nullable: true,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          species: { type: Type.STRING, nullable: true },
                          oxidation_state: { type: Type.NUMBER },
                        },
                      },
                    },
                    arrows: {
                      type: Type.ARRAY,
                      nullable: true,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          from_index: { type: Type.NUMBER },
                          to_index: { type: Type.NUMBER },
                          label: { type: Type.STRING, nullable: true },
                        },
                      },
                    },
                    color_from: { type: Type.STRING, nullable: true },
                    color_to: { type: Type.STRING, nullable: true },
                    bidentate_count: { type: Type.NUMBER, nullable: true },
                    teeth_per_ligand: { type: Type.NUMBER, nullable: true },
                    result_coordination: { type: Type.NUMBER, nullable: true },
                  },
                },
                student_input_parsing: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    segments: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          is_error: { type: Type.BOOLEAN },
                          error_reason: { type: Type.STRING, nullable: true },
                          correction: { type: Type.STRING, nullable: true }
                        }
                      }
                    }
                  }
                },
                visualization_code: {
                  type: Type.OBJECT,
                  nullable: true,
                  description: '若有圖表需求必須填入，否則設為 null',
                  properties: {
                    explanation: { type: Type.STRING },
                    visualizations: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          type: {
                            type: Type.STRING,
                            description:
                              'scatter | plotly_chart | mol3d | svg_diagram | chem_aromatic_ring（苯環/吡啶+孤對電子）| physics_wave_interference | physics_snell_diagram | stem_xy_chart（x/y 陣列+chart_kind line|scatter）',
                          },
                          x: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                          y: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                          mode: { type: Type.STRING },
                          name: { type: Type.STRING },
                          data: {
                            type: Type.ARRAY,
                            description: 'Plotly traces；欄位依圖表類型取捨',
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                type: { type: Type.STRING, nullable: true },
                                x: {
                                  type: Type.ARRAY,
                                  nullable: true,
                                  items: { type: Type.NUMBER, nullable: true },
                                },
                                y: {
                                  type: Type.ARRAY,
                                  nullable: true,
                                  items: { type: Type.NUMBER, nullable: true },
                                },
                                z: {
                                  type: Type.ARRAY,
                                  nullable: true,
                                  items: { type: Type.NUMBER, nullable: true },
                                },
                                mode: { type: Type.STRING, nullable: true },
                                name: { type: Type.STRING, nullable: true },
                                text: {
                                  type: Type.ARRAY,
                                  nullable: true,
                                  items: { type: Type.STRING, nullable: true },
                                },
                              },
                            },
                          },
                          layout: {
                            type: Type.OBJECT,
                            nullable: true,
                            description: 'Plotly layout；可只填常用鍵',
                            properties: {
                              title: { type: Type.STRING, nullable: true },
                            },
                          },
                          svgCode: { type: Type.STRING },
                          cid: { type: Type.STRING },
                          smiles: { type: Type.STRING, nullable: true, description: 'mol3d 等用 SMILES' },
                          title: { type: Type.STRING, nullable: true, description: '圖表或 3D 標題' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          compounds: {
            type: Type.ARRAY,
            description: '題目中出現的所有化合物，供前端渲染結構式與 3D 模型',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'PubChem 可搜尋的化合物名稱（英文或繁體中文）' },
                formula: { type: Type.STRING, description: '化學式，例如 H2SO4、C6H12O6' },
                smiles: { type: Type.STRING, nullable: true, description: '標準 SMILES，供結構式與 3D' },
                english_name: { type: Type.STRING, nullable: true, description: 'IUPAC 或精確英文名，供 PubChem name 查詢' },
              },
              required: ['name'],
            },
          },
        },
      },
    }),
  };

  let result;
  try {
    const isMultimodalContents =
      typeof contents === 'object' &&
      contents !== null &&
      'parts' in contents &&
      Array.isArray((contents as { parts?: unknown }).parts);
    const stemPhase3HighOutput =
      !!subjectId && STEM_PHASE3_HIGH_OUTPUT_SUBJECT_IDS.has(subjectId);
    const compoundsSchemaByName = COMPOUNDS_SCHEMA_SUBJECTS.some((k) => subjectName.includes(k));
    const baseProMs = getProTimeoutMs(promptForTimeout);
    // 多模態僅以文字計時會低估；高分科 Phase3 JSON 體積大，Pro 需更長等待以免誤降級 Flash
    let proWaitMs = Math.max(baseProMs, 240_000);
    if (isMultimodalContents || stemPhase3HighOutput || compoundsSchemaByName) {
      proWaitMs = Math.max(proWaitMs, 360_000);
    }
    /** 實測 Console：生物 Phase3 Pro 在 360000ms 整點逾時後降級 Flash；略延長以降低「剛好斷在上限」的誤判 */
    if (subjectId === AST_BIOLOGY_PHASE3_SUBJECT_ID) {
      proWaitMs = Math.max(proWaitMs, 480_000);
    }
    result = await withTimeout(
      generateContentWithRetry(ai, {
        model: 'gemini-3.1-pro-preview',
        contents,
        config: baseConfig,
      }, 3, 2000),
      proWaitMs
    );
  } catch (e) {
    const fallbackReason = e instanceof Error ? e.message : String(e);
    console.warn('[runModeratorSynthesis] Pro 逾時或失敗，改以 Flash 模型重試:', fallbackReason);
    // #region agent log
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '42c4c3' },
      body: JSON.stringify({
        sessionId: '42c4c3',
        runId: 'post-timeout-tweak',
        hypothesisId: 'H1',
        location: 'geminiService.ts:runModeratorSynthesis:proCatch',
        message: 'Pro failed; Flash fallback',
        data: {
          subjectId: subjectId ?? null,
          subjectName,
          fallbackReason,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    // Fallback: Flash (High persistence: 4 retries)
    result = await generateContentWithRetry(ai, {
      model: GEMINI_FLASH_FALLBACK_MODEL,
      contents,
      config: baseConfig,
    }, 4, 2000);
  }
  
  let parsed;
  if (strategy.parseResponse) {
    parsed = strategy.parseResponse(result.text || "");
    // Normalize new format to old format if necessary
    if (parsed && typeof parsed.score === 'number' && parsed.final_score === undefined) {
      parsed.final_score = parsed.score;
      parsed.remarks_zh = parsed.feedback || "";
      parsed.stem_sub_results = [{
        sub_id: "Q1",
        max_points: 10, // Default or inferred
        setup: parsed.subScores?.concept || 0,
        process: parsed.subScores?.calculation || 0,
        result: parsed.score,
        logic: parsed.subScores?.concept || 0,
        feedback: parsed.feedback || "",
        visualization_code: parsed.visualization ? {
          explanation: "AI Generated Visualization",
          visualizations: [parsed.visualization]
        } : null
      }];
    }
  } else {
    parsed = safeJsonParse(result.text);
  }

  // Flash fallback 或 JSON 截斷：嘗試從不完整的 JSON 文字中搶救基本結構
  if (parsed == null && result.text) {
    const rawText = result.text;
    console.warn('[runModeratorSynthesis] safeJsonParse returned null, attempting truncated JSON recovery...');
    try {
      // 嘗試從截斷的 JSON 中提取至少部分可用的結構
      let partial = rawText.trim().replace(/^```(?:json)?|```$/g, '').trim();
      // 找到最後一個完整的 } 或 ] 以截取可用部分
      let braceDepth = 0;
      let lastValidEnd = -1;
      for (let ci = 0; ci < partial.length; ci++) {
        const ch = partial[ci];
        if (ch === '{') braceDepth++;
        else if (ch === '}') {
          braceDepth--;
          if (braceDepth === 0) lastValidEnd = ci;
        }
      }
      if (lastValidEnd > 0) {
        const truncated = partial.slice(0, lastValidEnd + 1);
        parsed = safeJsonParse(truncated);
        if (parsed) {
          console.log('[runModeratorSynthesis] Truncated JSON recovery succeeded');
        }
      }
      // 進一步嘗試：補全截斷的 JSON
      if (parsed == null) {
        const repaired = jsonrepair(partial);
        parsed = safeJsonParse(repaired);
        if (parsed) {
          console.log('[runModeratorSynthesis] jsonrepair recovery succeeded on raw text');
        }
      }
    } catch (recoveryErr) {
      console.warn('[runModeratorSynthesis] Truncated JSON recovery failed:', recoveryErr);
    }
  }

  if (parsed) {
    if (COMPOUNDS_SCHEMA_SUBJECTS.some((k) => subjectName.includes(k)) && !Array.isArray(parsed.compounds)) {
      (parsed as { compounds: unknown[] }).compounds = [];
    }
    if (!parsed.detailed_fixes) parsed.detailed_fixes = [];
    if (!parsed.ceec_results) parsed.ceec_results = { total_score: 0, breakdown: {} };
    if (!parsed.stem_sub_results) parsed.stem_sub_results = [];
    else if (!Array.isArray(parsed.stem_sub_results)) parsed.stem_sub_results = [parsed.stem_sub_results];
    parsed.stem_sub_results = dedupeStemSubResultsBySubId(
      parsed.stem_sub_results as Record<string, unknown>[],
    ) as typeof parsed.stem_sub_results;
    if (!parsed.growth_roadmap) parsed.growth_roadmap = [];
    for (const sub of parsed.stem_sub_results as { key_molecules_smiles?: unknown }[]) {
      if (!Array.isArray(sub.key_molecules_smiles)) sub.key_molecules_smiles = [];
    }
    normalizePhase3StemSubResultsForDisplay(parsed, subjectName);
    if (/生物|biology/i.test(subjectName) && Array.isArray(parsed.stem_sub_results)) {
      const rootMax = Number((parsed as { max_score?: unknown }).max_score);
      const n = parsed.stem_sub_results.length || 1;
      const perSub =
        Number.isFinite(rootMax) && rootMax > 0 ? Math.max(1, rootMax / n) : 5;
      const rz =
        typeof (parsed as { remarks_zh?: unknown }).remarks_zh === 'string'
          ? (parsed as { remarks_zh: string }).remarks_zh.trim()
          : '';
      for (const raw of parsed.stem_sub_results as Record<string, unknown>[]) {
        const mp = raw.max_points;
        if (typeof mp !== 'number' || !Number.isFinite(mp) || mp <= 0) {
          raw.max_points = perSub;
        }
        const fb = raw.feedback;
        if (typeof fb !== 'string' || !fb.trim()) {
          raw.feedback =
            rz ||
            '本子題未取得閱卷官點評；請參考上方主席綜評，或重新批改。';
        }
      }
    }
    if (/物理|physics/i.test(subjectName)) {
      normalizePhysicsStemSubScoresFromModerator(parsed as Record<string, unknown>);
    }

    // Flash fallback 產出的 visualization_code 常為空殼（data:[] 或缺少 visualizations），嘗試修復
    if (Array.isArray(parsed.stem_sub_results)) {
      for (const sub of parsed.stem_sub_results as Record<string, unknown>[]) {
        const vc = sub.visualization_code;
        if (vc && typeof vc === 'object' && !Array.isArray(vc)) {
          const vcObj = vc as Record<string, unknown>;
          const vizArr = vcObj.visualizations;
          if (Array.isArray(vizArr)) {
            // 修復 plotly_chart 空 data
            for (const v of vizArr as Record<string, unknown>[]) {
              if (v.type === 'plotly_chart' && Array.isArray(v.data) && (v.data as unknown[]).length === 0) {
                // 嘗試從 layout.title 或 x/y 根層級回填
                if (Array.isArray(v.x) && Array.isArray(v.y) && (v.x as unknown[]).length > 0) {
                  (v as Record<string, unknown>).data = [{ type: 'scatter', mode: 'lines+markers', x: v.x, y: v.y, name: (v as Record<string, unknown>).name || 'Data' }];
                }
              }
            }
          }
          // 模型有時只回傳根層級 type（如 stem_xy_chart）但不包在 visualizations[] 中
          if (typeof vcObj.type === 'string' && !vizArr) {
            vcObj.visualizations = [{ ...vcObj }];
          }
        }
      }
    }
    // #region agent log
    if (/物理|physics/i.test(subjectName) && parsed.stem_sub_results?.[0]) {
      const s0 = parsed.stem_sub_results[0] as Record<string, unknown>;
      const vc = s0.visualization_code;
      const v0 =
        vc && typeof vc === 'object' && !Array.isArray(vc) && Array.isArray((vc as { visualizations?: unknown }).visualizations)
          ? (vc as { visualizations: unknown[] }).visualizations[0]
          : null;
      const zc = s0.zero_compression as Record<string, unknown> | undefined;
      const subRaw = zc?.substitute;
      const subPhrase = '理論上彈性碰撞';
      const subStrLen = typeof subRaw === 'string' ? subRaw.length : 0;
      const subPhraseCount =
        typeof subRaw === 'string' ? subRaw.split(subPhrase).length - 1 : 0;
      // #region agent log
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '09f966' },
        body: JSON.stringify({
          sessionId: '09f966',
          runId: 'pre-fix',
          hypothesisId: 'H1-H2-H5',
          location: 'geminiService.ts:runModeratorSynthesis:physicsSubstitute',
          message: 'phase3 zero_compression.substitute shape',
          data: {
            substituteKind:
              subRaw == null ? 'null' : Array.isArray(subRaw) ? 'array' : typeof subRaw,
            substituteArrayLen: Array.isArray(subRaw) ? subRaw.length : null,
            substituteStringLen: subStrLen,
            phraseRepeatCount: subPhraseCount,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '875c85' },
        body: JSON.stringify({
          sessionId: '875c85',
          runId: 'post-fix',
          hypothesisId: 'H1-H5',
          location: 'geminiService.ts:runModeratorSynthesis:physicsStem0',
          message: 'phase3 first stem snapshot',
          data: {
            final_score: parsed.final_score,
            max_score: parsed.max_score,
            setup: s0.setup,
            process: s0.process,
            result: s0.result,
            logic: s0.logic,
            types: [typeof s0.setup, typeof s0.process, typeof s0.result, typeof s0.logic],
            feedbackLen: String(s0.feedback ?? '').length,
            viz0Type: v0 && typeof v0 === 'object' ? (v0 as { type?: string }).type : null,
            viz0DataLen:
              v0 && typeof v0 === 'object' && Array.isArray((v0 as { data?: unknown }).data)
                ? (v0 as { data: unknown[] }).data.length
                : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
  }
  // #region agent log
  {
    const chemH = /化學|chemistry/i.test(subjectName);
    if (chemH) {
      const rt = result?.text ?? '';
      const cand = (result as { candidates?: { finishReason?: string }[] })?.candidates?.[0];
      const fr = cand?.finishReason ?? null;
      const stemN = Array.isArray(parsed?.stem_sub_results) ? parsed.stem_sub_results.length : -1;
      const maxTok = maxOutputTokensForStemPhase3(subjectId);
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1e3c30' },
        body: JSON.stringify({
          sessionId: '1e3c30',
          runId: 'post-fix',
          hypothesisId: 'H1',
          location: 'geminiService.ts:runModeratorSynthesis:chemistryExit',
          message: 'chemistry phase3 output shape vs token cap',
          data: {
            subjectId: subjectId ?? null,
            maxOutputTokens: maxTok,
            responseTextLen: rt.length,
            finishReason: fr,
            parsedStemSubCount: stemN,
            hasCompounds: Array.isArray((parsed as { compounds?: unknown })?.compounds),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
  }
  // #endregion
  // #region agent log
  {
    const bioH = /生物|biology/i.test(subjectName);
    if (bioH) {
      const rt = result?.text ?? '';
      const cand = (result as { candidates?: { finishReason?: string }[] })?.candidates?.[0];
      const fr = cand?.finishReason ?? null;
      const stemN = Array.isArray(parsed?.stem_sub_results) ? parsed.stem_sub_results.length : -1;
      const maxTok = maxOutputTokensForStemPhase3(subjectId);
      const compoundsOn = COMPOUNDS_SCHEMA_SUBJECTS.some((k) => subjectName.includes(k));
      const s0 =
        parsed && Array.isArray(parsed.stem_sub_results) && parsed.stem_sub_results[0]
          ? (parsed.stem_sub_results[0] as Record<string, unknown>)
          : null;
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '42c4c3' },
        body: JSON.stringify({
          sessionId: '42c4c3',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'geminiService.ts:runModeratorSynthesis:biologyExit',
          message: 'biology phase3 parse and token shape',
          data: {
            subjectId: subjectId ?? null,
            maxOutputTokens: maxTok,
            compoundsSchemaOn: compoundsOn,
            responseTextLen: rt.length,
            finishReason: fr,
            parsedIsNull: parsed == null,
            parsedStemSubCount: stemN,
            compoundsLen: Array.isArray((parsed as { compounds?: unknown[] })?.compounds)
              ? (parsed as { compounds: unknown[] }).compounds.length
              : null,
            sub0setup: s0?.setup,
            sub0process: s0?.process,
            sub0result: s0?.result,
            sub0logic: s0?.logic,
            textTail: rt.slice(-140),
            sub0feedbackLen:
              s0 && typeof (s0 as { feedback?: unknown }).feedback === 'string'
                ? (s0 as { feedback: string }).feedback.length
                : null,
            sub0correctCalcLen:
              s0 && typeof (s0 as { correct_calculation?: unknown }).correct_calculation === 'string'
                ? (s0 as { correct_calculation: string }).correct_calculation.length
                : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
  }
  // #endregion
  return parsed;
}

export async function generateReferenceSolution(
  content: string,
  subjectName: string,
  instructions: string,
  subjectId?: string,
  visionImages?: ModeratorVisionImages
): Promise<ModeratorSynthesis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isComposition = ['國文', 'Chinese', '英文', 'English', '作文'].some(k => subjectName.includes(k));

  const prompt = `
    Role: Expert CEEC Question Setter & Grader (大考中心命題與閱卷專家).
    Subject: ${subjectName}
    Instruction: ${instructions || 'Generate High-Quality CEEC-Style Solution (參考 CEEC 範文邏輯)'}
    
    Task: The student has NOT submitted an answer. Please generate a **Standard Reference Solution (標準詳解)**.
    
    # CRITICAL FORMATTING RULES (STRICT):
    1. **NO Markdown Code Blocks**: Do NOT wrap the JSON output in \`\`\`json ... \`\`\`. Output RAW JSON string only.
    2. **Double Escape Backslashes**: You MUST use \`\\\\\` for LaTeX backslashes (e.g., \`\\\\frac\`).
    3. **No Python Code**: Do NOT output Python/Matplotlib code. Use the JSON visualization format below.

    # LOGIC:
    1. Analyze the Question's core requirements.
    ${isComposition 
      ? '2. Provide a high-quality model essay that reflects "CEEC A+ Standards".'
      : `2. **ULTRA-DETAILED STEP-BY-STEP DERIVATION (絕對禁止跳步驟)**:
         You MUST act as a patient tutor. Break down the math/science problem into MICRO-STEPS.
         Follow this exact structure for Method 1:
         - 【已知條件】(Given): List all variables and numbers explicitly.
         - 【核心公式】(Formula): State the theorem or formula used before plugging in numbers.
         - 【代入數據】(Substitution): Show the exact equation with numbers plugged in.
         - 【逐步推導】(Micro-Algebra): Show EVERY single algebraic manipulation. DO NOT combine steps. (e.g., if moving a variable, show the intermediate state).
         - 【最終答案】(Final Answer): State the final result with correct units.
         - If applicable, provide **Method 2** (Alternative/Faster Approach) with the same rigor.`
    }
    
    # VISUALIZATION ENGINE (JSON OBJECT) — 標準詳解與完整批改相同，不可省略可畫圖之題：
    ${isComposition 
      ? 'Do not generate visualizations for composition tasks.'
      : `Each \`stem_sub_results[]\` item MUST include the key \`visualization_code\`: either \`null\` (only if that sub-question is purely symbolic algebra with **no** geometric, graphical, vector, or solid-figure meaning) **or** an object \`{ "explanation": "...", "visualizations": [ ... ] }\` with **at least one** client-renderable item.

    **ABSOLUTE PROHIBITION**: Do NOT output \`plotly_chart\` with an **empty** \`"data": []\` array — the UI rejects it and the student sees no figure. Every \`plotly_chart\` MUST have \`data\` as a **non-empty** array of Plotly traces (numeric coordinates; strings are coerced but prefer JSON numbers).

    **Types (same as full grading)**: \`plotly_chart\` (3D/2D traces), \`geometry_json\` / \`svg_diagram\` for plane figures, \`python_plot\` for explicit function graphs when appropriate, \`mol3d\` for chemistry, etc.

    **3D geometry correctness (CRITICAL)**:
    - For a **right circular cone**, use \`mesh3d\` with a circular base (many vertices around the circle, e.g. 48 segments) plus apex—never approximate a cone with only a 4-vertex tetrahedron.
    - For a **surface of revolution** (e.g. rotating a curve around the x-axis), include BOTH a \`scatter3d\` trace for the generatrix AND a semi-transparent \`mesh3d\` for the swept surface (adequate resolution in both x and angle).

    **JSON shape (conceptual)**:
    "visualization_code": {
       "explanation": "繁中簡述圖形與題意對應",
       "visualizations": [{ "type": "plotly_chart", "title": "…", "data": [ /* ≥1 trace */ ], "layout": { "scene": { ... } } }]
    }`
    }
    
    Content: ${content}
    
    Output JSON Schema (ModeratorSynthesis):
    {
      "final_score": 0,
      "max_score": 20,
      "remarks_zh": "Comprehensive analysis of key concepts (題旨與考點分析) in Traditional Chinese.",
      "stem_sub_results": [
        {
          "sub_id": "Q1",
          "max_points": 10,
          "feedback": "Analysis",
          "correct_calculation": "${isComposition ? 'Model Essay Content' : 'Full step-by-step derivation with $$...$$ math blocks. MUST include 【已知條件】, 【核心公式】, 【代入數據】, 【逐步推導】, 【最終答案】.'}",
          "visualization_code": ${isComposition ? 'null' : '{ "explanation": "圖示與題意", "visualizations": [{ "type": "plotly_chart", "title": "示意標題", "data": [{ "type": "scatter3d", "mode": "lines", "x": [0, 1], "y": [0, 0], "z": [0, 0], "line": { "width": 4, "color": "#3b82f6" } }], "layout": { "scene": { "aspectmode": "cube", "xaxis": { "title": "x" }, "yaxis": { "title": "y" }, "zaxis": { "title": "z" } } } }] }'},
          "setup": 0, "process": 0, "result": 0, "logic": 0
        }
      ],
      "ceec_results": { "total_score": 0, "breakdown": {} },
      "detailed_fixes": [],
      "growth_roadmap": [],
      "corrected_article": "Optional: Full Model Essay text if applicable."
    }
    `;

  const visionPrefix =
    '【多模態參考影像】以下依序為：(1) 題目圖片 (2) 詳解／參考圖片 (3) 學生作答圖片。各區塊可能含多張圖，請與下方 OCR／轉錄文字互相對照。\n\n';
  const hasVisionUrls =
    !!visionImages &&
    ((visionImages.question?.length ?? 0) > 0 ||
      (visionImages.reference?.length ?? 0) > 0 ||
      (visionImages.student?.length ?? 0) > 0);
  const useRefMultimodal =
    !!subjectId &&
    MATH_VISION_PHASE3_SUBJECT_IDS.has(subjectId) &&
    hasVisionUrls;

  let refContents: string | { parts: any[] };
  if (useRefMultimodal && visionImages) {
    const parts: any[] = [];
    const pushNonEmpty = (urls: string[] | undefined) => {
      if (!urls) return;
      for (const u of urls) {
        if (u && String(u).trim()) parts.push(dataUrlToInlinePart(u));
      }
    };
    pushNonEmpty(visionImages.question);
    pushNonEmpty(visionImages.reference);
    pushNonEmpty(visionImages.student);
    parts.push({ text: visionPrefix + prompt });
    refContents = { parts };
  } else {
    refContents = prompt;
  }
  const refPromptForTimeout =
    typeof refContents === 'string' ? refContents : visionPrefix + prompt;

  // #region agent log
  const refInlineCount =
    typeof refContents === 'object' && refContents && 'parts' in refContents
      ? Math.max(0, (refContents as { parts: unknown[] }).parts.length - 1)
      : 0;
  fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b2efe'},body:JSON.stringify({sessionId:'0b2efe',runId:'post-fix',hypothesisId:'REF_VISION',location:'geminiService.ts:generateReferenceSolution:contents',message:'reference solution payload',data:{subjectId:subjectId??null,useRefMultimodal,refInlineCount,contentLen:content.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  
  try {
      // 標準詳解常含長篇 JSON／圖表：Pro 等待時間至少 4 分鐘，降低不必要降級 Flash
      const proWaitMs = Math.max(getProTimeoutMs(refPromptForTimeout), 240_000);
      const result = await withTimeout(
        generateContentWithRetry(ai, {
          model: 'gemini-3.1-pro-preview',
          contents: refContents,
          config: { 
            responseMimeType: "application/json",
            systemInstruction: buildSystemInstruction(STRICT_MATH_FORMAT_RULES, subjectName),
            temperature: 0.2,
            maxOutputTokens: maxOutputTokensForStemPhase3(subjectId),
          }
        }, 1, 1000),
        proWaitMs
      );
      const refParsed = safeJsonParse(result.text) || {};
      normalizePhase3StemSubResultsForDisplay(refParsed, subjectName);
      return refParsed;
  } catch (e) {
      if (import.meta.env.DEV) {
        console.debug('[generateReferenceSolution] Pro 逾時或失敗，改以 Flash 模型重試', e);
      }
      const result = await generateContentWithRetry(ai, {
        model: GEMINI_FLASH_FALLBACK_MODEL,
        contents: refContents,
        config: { 
          responseMimeType: "application/json",
          systemInstruction: buildSystemInstruction(STRICT_MATH_FORMAT_RULES, subjectName),
          temperature: 0.2,
          maxOutputTokens: maxOutputTokensForStemPhase3(subjectId),
        }
      }, 4, 2000);
      const refParsedFlash = safeJsonParse(result.text) || {};
      normalizePhase3StemSubResultsForDisplay(refParsedFlash, subjectName);
      return refParsedFlash;
  }
 }
export async function analyzeChineseSection(
  sectionTitle: string,
  subQuestions: ChineseTaskContent[],
  instructions?: string
): Promise<SectionResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sectionResults: any[] = [];
  let totalSectionScore = 0;

  for (let i = 0; i < subQuestions.length; i++) {
    const q = subQuestions[i];
    if ((!q.question || !q.question.trim()) && (!q.student || !q.student.trim()) && subQuestions.length > 1) continue;
    
    const hasStudentInput = q.student && q.student.trim().length > 5;
    const subId = `第 ${i + 1} 子題`;

    const prompt = `
            Role: 114學年度大學學測國語文寫作能力測驗 - 閱卷召集人 (CEEC Chief Grader).
            Task: ${hasStudentInput ? 'Grade this specific sub-question' : 'Generate Model Essay'}.
            Target Subject: ${sectionTitle} (國寫)
            Current Sub-Question Index: ${i+1} / ${subQuestions.length}
            
            Input Data:
            - Question Text: ${JSON.stringify(q.question)}
            - Student Answer: ${JSON.stringify(q.student)}
            
            User Instructions: ${instructions || 'Strict adherence to CEEC grading standards.'}

            # 🛑 核心任務：配分偵測與評分 (CRITICAL SCORING)
            1. **配分偵測 (Score Extraction)**:
               - 請仔細閱讀「Question Text」。
               - 尋找關鍵字如「占4分」、「占7分」、「占18分」、「占21分」。
               - **若題目明確標示分數**：該分數即為 \`max_points\`。
               - **若題目未標示分數**：
                 - 若為第一題 (Sub-question 1) 且要求簡答/條列：預設 \`max_points\` = **4** 或 **7**。
                 - 若為第二題 (Sub-question 2) 且要求完整文章：預設 \`max_points\` = **21** 或 **18**。
                 - 國寫每一大題 (Section) 的總滿分通常為 **25 分**。
            
            2. **評分標準 (CEEC Rubric)**:
               - **知性題 (Intellectual)**: 著重「觀點、論據、邏輯、組織」。
               - **情意題 (Emotional)**: 著重「情感、體悟、想像、文辭」。
               - **評分等級 (參考)**:
                 - A+ (90-100%): 內容深刻，結構嚴謹，文辭優美。
                 - A  (80-89%): 內容充實，結構完整，文辭通順。
                 - B+ (70-79%): 內容尚可，結構大致完整。
                 - B  (60-69%): 內容平淡，結構鬆散。
                 - C  (below 60%): 離題、內容貧乏或未寫完。

            3. **評語要求 (Feedback)**:
               - 必須使用 **繁體中文**。
               - 必須包含「得分理由」與「改進建議」。
               - 若為簡答題，重點在於「精準度」。
               - 若為作文題，重點在於「深度與結構」。
               
            4. **總分邏輯**: 
               - 若本題只是 25 分中的一個子題 (例如子題 1)，分數不應超過其配分 (例如 4 分)。
               - 除非學生未作答，否則 \`score\` 必須大於 0。

            # OUTPUT JSON FORMAT (Strict JSON, No Markdown):
            You must output a single valid JSON object matching this structure exactly:
            {
              "sub_id": "${subId}",
              "grading_rationale": "Thinking process: 1. Detect max points from text... 2. Analyze student content... 3. Map to rubric...",
              "score": number (Float, e.g., 3.5 or 18.5),
              "max_points": number (Verify from text, e.g., 4, 7, 21, 25),
              "score_breakdown": "String. Explicitly state: '本題滿分為 [X] 分 (依據題目...)，學生得分為 [Y] 分'",
              "feedback": "Detailed examiner critique in Traditional Chinese. Start with the CEEC Grade (e.g., [A級]...)",
              "student_response": "The transcribed student text",
              "revision_suite": {
                "topic_relevance": "【扣題分析】(必填)...詳細分析學生是否切題...",
                "polished_sentences": [
                  { "type": "Sentence Variety", "original": "exact original sentence", "refined": "refined version", "logic": "why refined" }
                ],
                "paragraph_diagnostics": [
                  { "paragraph_id": "P1", "main_idea": "...", "critique": "...", "suggestion": "..." }
                ],
                "annotations": [
                   { "text": "exact substring from student text", "type": "錯別字/語法/修辭", "explanation": "..." }
                ],
                "masterpiece_alignment": {
                   "publication": "古文觀止 / 現代名家 (e.g., 余光中, 張愛玲)",
                   "quote": "Relevant quote or style example",
                   "analysis": "Comparative analysis"
                },
                "optimized_rewrite": "Full rewritten version of the student's essay (or a model essay if no input) in high-level Chinese.",
                "overall_suggestions": [
                   { "title": "Suggestion 1", "content": "Details..." },
                   { "title": "Suggestion 2", "content": "Details..." },
                   { "title": "Suggestion 3", "content": "Details..." }
                ]
              }
            }
        `;

    try {
        let res;
        try {
            // Attempt with Pro model (Fail Fast: 1 retry), with dynamic timeout
            // prompt 已在此迴圈內組好（含 q.question, q.student, instructions 等），傳入 getProTimeoutMs 計算正確
            res = await withTimeout(
                generateContentWithRetry(ai, {
                    model: 'gemini-3.1-pro-preview',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                }, 1, 1000),
                getProTimeoutMs(prompt)
            );
        } catch (e) {
            console.info(`[analyzeChineseSection] 子題 ${i + 1} Pro 逾時或失敗，改以 Flash 重試`);
            res = await generateContentWithRetry(ai, {
                model: GEMINI_FLASH_FALLBACK_MODEL,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            }, 4, 2000);
        }

        let subResult = safeJsonParse(res.text);

        if (subResult) {
            if (!subResult.sub_id) subResult.sub_id = subId;
            
            if (hasStudentInput) {
                // Ensure score is a valid number, default to 0 if missing/null to avoid UI glitches
                if (typeof subResult.score !== 'number' || isNaN(subResult.score)) {
                    subResult.score = 0;
                }
                subResult.student_response = q.student;
            } else {
                subResult.score = 0;
            }
            
            // Enforce max points cap strictly on the client side just in case
            if (subResult.score > subResult.max_points) {
                subResult.score = subResult.max_points;
            }
            
            sectionResults.push(subResult);
            totalSectionScore += (subResult.score || 0);
        }
    } catch (e: any) {
        console.error(`Error analyzing sub-question ${i}:`, e);
        sectionResults.push({
            sub_id: `第 ${i+1} 子題 (Error)`,
            score: 0,
            max_points: 25,
            feedback: `分析失敗: ${e.message || "系統忙碌中，請稍後再試"}`,
            revision_suite: { optimized_rewrite: "無法生成", overall_suggestions: [] }
        });
    }
  }

  return {
    section_title: sectionTitle,
    total_section_score: totalSectionScore,
    sub_results: sectionResults
  };
}

const SUPPORT_SYSTEM_INSTRUCTION = `你是專業、友善的技術客服助手，專門協助 Asea 學習平台的用戶。

【角色定位】
- 以專業、友善的態度回答用戶問題
- 使用繁體中文，簡短且禮貌地回應
- 僅回答與本平台功能或學科操作相關的問題（如：批改流程、學科使用方式、介面操作等）

【限制條款】
- 若遇到無法解答、超出平台範圍、或不當的問題，請委婉引導使用者：「建議您聯絡真人客服，我們將有專人為您服務。」
- 不得回答與平台無關的個人建議、醫療、法律等專業領域問題
- 為保護隱私，請勿要求或處理密碼、信用卡等敏感資訊`;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 客服對話：使用 Gemini 3 Flash，具備上下文記憶。
 * 需在前端使用 VITE_GEMINI_API_KEY。
 */
export async function sendChatToGemini(messages: ChatTurn[]): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error(
      '遺失 API 密鑰，請在 .env 中設定 VITE_GEMINI_API_KEY，並重新啟動開發伺服器。'
    );
  }
  if (!messages || messages.length === 0) {
    throw new Error('訊息列表不得為空。');
  }
  const ai = new GoogleGenAI({ apiKey: String(apiKey).trim() });

  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const result = await generateContentWithRetry(
    ai,
    {
      model: 'gemini-3.1-pro-preview',
      contents,
      config: {
        systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    },
    3,
    2000
  );

  return result.text || '';
}

/**
 * 針對科學教育情境強化圖像 prompt。
 *
 * Gemini 圖像模型對「科學示意圖」的理解需要明確引導：
 * - 指定風格（教科書插圖、白底、清晰標籤）
 * - 避免模型產出寫實照片或藝術風格
 * - 加入 no watermark 防止模型嵌入浮水印
 */
function enhanceScientificPrompt(raw: string): string {
  const trimmed = raw.trim();

  // 若 prompt 已包含風格指令，不重複添加
  const hasStyleHint =
    trimmed.includes('diagram') ||
    trimmed.includes('illustration') ||
    trimmed.includes('scientific') ||
    trimmed.includes('示意圖') ||
    trimmed.includes('圖解');

  if (hasStyleHint) return trimmed;

  return [
    'Scientific educational diagram,',
    'clean white background, clear labels,',
    'textbook illustration style, vector-like,',
    'no watermark, high detail:',
    trimmed,
  ].join(' ');
}

/**
 * 圖片生成：透過後端 Vercel Function 呼叫 Nano Banana Pro
 * 回傳 data URL（base64），可直接賦值給 <img src>
 *
 * 後端路由：/api/generate-image
 * 後端使用環境變數 GEMINI_API_KEY（不帶 VITE_，不會打包進前端）
 */
export async function fetchGeneratedImage(prompt: string): Promise<string> {
  // 開發環境可用 VITE_IMAGE_GENERATION_API_URL 指向 localhost 後端
  // 正式環境 Vercel 會自動把 /api/* 對應到 Serverless Function，
  // 所以預設值 '/api/generate-image' 在 Vercel 部署後即可直接使用。
  const apiUrl =
    (import.meta as any).env?.VITE_IMAGE_GENERATION_API_URL ||
    '/api/generate-image';

  // 呼叫前先強化 prompt
  const enhancedPrompt = enhanceScientificPrompt(prompt);

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: enhancedPrompt }),
    });
  } catch (networkErr) {
    throw new Error('無法連線至圖片生成服務，請確認網路或後端狀態。');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.error || '';
    } catch {
      // ignore parse error
    }
    throw new Error(
      detail || `圖片生成失敗（HTTP ${response.status}），請稍後再試。`
    );
  }

  const data = await response.json();
  const imageUrl: string =
    data.imageUrl || data.url || data.image_url || '';

  if (!imageUrl) {
    throw new Error('後端未回傳圖片 URL，請檢查後端日誌。');
  }

  return imageUrl;
}

export async function getChineseOverallRemarks(sections: SectionResult[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const content = JSON.stringify(sections.map(s => ({ 
    title: s.section_title, 
    score: s.total_section_score, 
    feedback: s.sub_results?.map(sub => sub.feedback) || []
  })));
  
  const result = await generateContentWithRetry(ai, {
    model: 'gemini-3.1-pro-preview',
    contents: `你是閱卷主席。根據以下國寫各題評分結果，撰寫一段精簡的總體評語(100字內，繁體中文)。輸入資料: ${content}`,
  }, 3, 2000);
  return result.text || "無法產生總評";
}

