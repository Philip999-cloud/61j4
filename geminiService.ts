
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { 
  LinguisticAudit, 
  SubjectExpertAnalysis, 
  ModeratorSynthesis, 
  SectionResult,
  ChineseTaskContent,
  GradingResults
} from "./types";
import { StrategyFactory } from "./strategies/StrategyFactory";

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
const COMPOUNDS_SCHEMA_SUBJECTS = ['化學', 'Chemistry', '自然', '物理', 'Physics'];

/**
 * 判斷是否為化學科目
 */
function isChemistrySubject(subjectName: string): boolean {
  return CHEMISTRY_SUBJECTS.some(k => subjectName.includes(k));
}

function buildSystemInstruction(baseInstruction: string, subjectName: string): string {
  console.log('[buildSystemInstruction] subjectName:', subjectName, 'isChemistry:', isChemistrySubject(subjectName));
  if (!isChemistrySubject(subjectName)) return baseInstruction;

  return baseInstruction + `

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

// Enhanced Retry Logic with Exponential Backoff
async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3, baseDelay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await ai.models.generateContent(params);
      return result;
    } catch (e: any) {
      lastError = e;
      console.error('Gemini API Error Details:', e);

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
        throw new Error('API 密鑰無效或已過期，請檢查 .env 中的 VITE_GEMINI_API_KEY 設定。');
      }
      if (
        status === 404 ||
        errMsgLower.includes('model_not_found') ||
        (errMsgLower.includes('model') && errMsgLower.includes('not found'))
      ) {
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
      
      // 3. Exponential Backoff
      if (isTransient && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 500); // Add jitter
        console.warn(`Gemini API Transient Error (${status}). Retrying in ${Math.round(delay)}ms... (Attempt ${i+1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
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
 * 根據 prompt 長度動態計算 Pro 模型的等待上限。
 * - 短 prompt（< 2000 字）：20 秒，適合單題簡單計算
 * - 中等 prompt（2000–4000 字）：35 秒，適合一般化學/物理多步驟
 * - 長 prompt（> 4000 字）：50 秒，適合複雜多子題或含圖題
 */
function getProTimeoutMs(prompt: string): number {
  const len = typeof prompt === 'string' ? prompt.length : JSON.stringify(prompt).length;
  // 針對 Pro 複雜圖表與長文本，放寬超時上限至 1.5 ~ 2.5 分鐘
  if (len > 4000) return 150000; // 150 秒
  if (len > 2000) return 120000; // 120 秒
  return 90000; // 90 秒
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

// Enhanced JSON Parsing with Multi-Stage Recovery
function safeJsonParse(text: string | null | undefined): any {
  if (!text) return null;
  
  // 1. Clean Markdown Code Blocks
  let cleaned = text.replace(/^```(?:json)?|```$/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '').trim();

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
        console.error("JSON Parse 最終失敗", e3);
        return null;
      }
    }
  }
}

const STEM_KEYWORDS = ['數學', '物理', '化學', '生物', '自然', 'Math', 'Physics', 'Chemistry', 'Biology', 'Science', '數甲', '數A', '數B'];

export async function transcribeHandwrittenImages(images: string[], mode: 'question' | 'answer' = 'answer', isVisualGraphingTask: boolean = false): Promise<string> {
  if (!images || images.length === 0) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
      return result.text || "";
    } catch (e) {
      console.warn("Visual Graphing Task failed, returning empty string.", e);
      return "";
    }
  }
  
  let prompt = "";
  if (mode === 'question') {
    prompt = `
      Role: Professional OCR Specialist (Chinese & STEM).
      Task: Transcribe the exam question image into text.
      
      Strict Rules:
      1. **Transcription Accuracy**: Output the text EXACTLY as seen.
      2. **Score Extraction**: If the text contains score allocation (e.g., "(1) 占4分"), you MUST transcribe it accurately. This is critical for grading.
      3. **Math/Science**: Use LaTeX format for all formulas (wrapped in $$).
      4. **Structure**: Preserve question numbers (1, 2, (1), (2)) and option lists (A, B, C, D).
      5. **Language**: Primarily Traditional Chinese (繁體中文).
    `;
  } else {
    // Optimized for Chinese Composition Handwriting
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
    return result.text || "";
  } catch (e) {
    console.warn("OCR Flash failed, retrying with 2.5...");
    const result = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-pro-preview',
      contents: { parts }
    }, 2, 2000);
    return result.text || "";
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

export async function runModeratorSynthesis(content: string, subjectName: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): Promise<ModeratorSynthesis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const strategy = StrategyFactory.getStrategy(subjectName);
  
  let prompt: string;
  let systemInstruction = STRICT_MATH_FORMAT_RULES;

  if (strategy.getSystemPrompt) {
    systemInstruction = strategy.getSystemPrompt();
    prompt = `
      Please grade the following student response based on the provided audit and expert analysis.
      
      Student Content: ${content}
      Linguistic Audit: ${JSON.stringify(audit)}
      Subject Expert Analysis: ${JSON.stringify(expert)}
      Additional Instructions: ${instructions || 'None'}
    `.trim();
  } else {
    prompt = strategy.generatePrompt!(content, audit, expert, instructions);
  }
  
  const baseConfig = {
    responseMimeType: "application/json" as const,
    systemInstruction: buildSystemInstruction(systemInstruction, subjectName),
    temperature: 0.2,
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
              properties: {
                sub_id: { type: Type.STRING },
                setup: { type: Type.NUMBER },
                process: { type: Type.NUMBER },
                result: { type: Type.NUMBER },
                logic: { type: Type.NUMBER },
                max_points: { type: Type.NUMBER },
                feedback: { type: Type.STRING },
                correct_calculation: { type: Type.STRING },
                concept_correction: { type: Type.STRING, nullable: true },
                alternative_solutions: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                knowledge_tags: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                scientific_notation_and_units: { type: Type.STRING, nullable: true },
                internal_verification: { type: Type.STRING, nullable: true },
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
                          type: { type: Type.STRING, description: 'scatter | plotly_chart | mol3d | svg_diagram' },
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
    // Primary: Pro (FAIL FAST: 1 retry only). If it's busy or timeout, swap to Flash.
    result = await withTimeout(
      generateContentWithRetry(ai, {
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: baseConfig,
      }, 1, 1000),
      getProTimeoutMs(prompt)
    );
  } catch (e) {
    console.warn("Moderator Synthesis (Pro) failed/busy, failing over to Flash...", e);
    // Fallback: Flash (High persistence: 4 retries)
    result = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
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

  if (parsed) {
    console.log('[runModeratorSynthesis] stem_sub_results viz:', parsed.stem_sub_results?.map((s: any) => ({ id: s.sub_id, hasViz: !!s.visualization_code, vizCode: s.visualization_code })));
    if (!parsed.detailed_fixes) parsed.detailed_fixes = [];
    if (!parsed.ceec_results) parsed.ceec_results = { total_score: 0, breakdown: {} };
    if (!parsed.stem_sub_results) parsed.stem_sub_results = [];
    if (!parsed.growth_roadmap) parsed.growth_roadmap = [];
  }
  return parsed;
}

export async function generateReferenceSolution(content: string, subjectName: string, instructions: string): Promise<ModeratorSynthesis> {
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
      : '2. **STEP-BY-STEP DERIVATION (One Problem, Multiple Solutions)**:\n       - Provide **Method 1** (Standard Approach) with detailed steps.\n       - If applicable, provide **Method 2** (Alternative/Faster Approach).\n       - Explain "How to approach this problem" for students.'
    }
    
    # VISUALIZATION ENGINE (JSON OBJECT):
    ${isComposition 
      ? 'Do not generate visualizations for composition tasks.'
      : `For STEM subjects (Math, Physics, Chemistry, Biology, Earth Science), you MUST generate a 3D Interactive Plot using \`plotly_chart\` to illustrate the concepts (e.g., force vectors, molecular structures, geometric shapes).
    
    **JSON Structure**:
    "visualization_code": {
       "explanation": "Brief explanation of the visual...",
       "visualizations": [{
          "type": "plotly_chart",
          "title": "Topic Title",
          "data": [ ...traces array... ],
          "layout": { ...layout object... }
       }]
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
          "correct_calculation": "${isComposition ? 'Model Essay Content' : 'Full step-by-step derivation with $$...$$ math blocks.'}",
          "visualization_code": ${isComposition ? 'null' : '{ "explanation": "...", "visualizations": [{ "type": "plotly_chart", "data": [], "layout": {} }] }'},
          "setup": 0, "process": 0, "result": 0, "logic": 0
        }
      ],
      "ceec_results": { "total_score": 0, "breakdown": {} },
      "detailed_fixes": [],
      "growth_roadmap": [],
      "corrected_article": "Optional: Full Model Essay text if applicable."
    }
    `;
  
  try {
      // Fail Fast on Pro (1 retry), with dynamic timeout
      const result = await withTimeout(
        generateContentWithRetry(ai, {
          model: 'gemini-3.1-pro-preview',
          contents: prompt,
          config: { 
            responseMimeType: "application/json",
            systemInstruction: buildSystemInstruction(STRICT_MATH_FORMAT_RULES, subjectName),
            temperature: 0.2
          }
        }, 1, 1000),
        getProTimeoutMs(prompt)
      );
      return safeJsonParse(result.text) || {};
  } catch (e) {
      // Fallback to Flash (4 retries)
      console.warn("Reference Solution (Pro) failed, retrying with Flash...", e);
      const result = await generateContentWithRetry(ai, {
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          systemInstruction: buildSystemInstruction(STRICT_MATH_FORMAT_RULES, subjectName),
          temperature: 0.2
        }
      }, 4, 2000);
      return safeJsonParse(result.text) || {};
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
            console.warn(`Sub-question ${i} (Pro) failed, falling back to Flash.`, e);
            // Fallback to Flash (Robust: 4 retries)
            res = await generateContentWithRetry(ai, {
                model: 'gemini-3.1-pro-preview',
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

