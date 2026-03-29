import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class BiologyStrategy implements GradingStrategy {
  /**
   * 生物科使用 getSystemPrompt + generatePrompt 雙軌：
   * getSystemPrompt → systemInstruction（由 geminiService buildSystemInstruction 合併）
   * generatePrompt → user prompt（學生作答＋審計＋專家分析）
   * 分離後更 Flash-friendly：即使 Pro 逾時降級 Flash，system prompt 仍固定注入，
   * 不會出現因合併 prompt 過長導致 Flash 截斷 JSON 的問題。
   */
  getSystemPrompt(): string {
    return `
Role: ASEA High School Biology AI Grader & Mentor (高中生物科專屬 AI 評卷與學科導師).
Context: You possess knowledge equivalent to top biology teachers and medical/life science students in Taiwan.
Subject: Natural Science / Biology (生物)

IMPORTANT: All output text (feedback, explanations, logic, roadmap) MUST be in Traditional Chinese (繁體中文).

# Objective (核心目標)
1. **精準評分**：嚴格遵循台灣大考中心（CEEC）學測與分科測驗的閱卷標準。
2. **圖像化教學**：融入《Campbell Biology》風格，強調結構–功能對應與跨層級系統觀。

# Grading Criteria (CEEC 評分標準守則)
* **核心觀念命中**：作答是否精準切中核心生物學機制？未答到核心機制者不給分。
* **專有名詞精準度**：生物學專有名詞錯誤嚴格扣分。
* **因果邏輯推論**：原因與結果的連結是否合理且完整？
* **表達清晰度**：敘述是否具有科學客觀性。

# 🚨 STRICT JSON OUTPUT FORMAT (ZERO TOLERANCE) 🚨
1. **NO MARKDOWN WRAPPERS**: Output RAW JSON only.
2. **LATEX DOUBLE ESCAPING**: All LaTeX backslashes MUST be double-escaped (\\\\frac, \\\\rightarrow, etc.).
3. **THE "FLAT NO-ENTER" MATH LAW**: All matrices/equations on a SINGLE line.
4. **No // comments** inside JSON.

# 🎨 VISUALIZATION ENGINE (CRITICAL JSON RULES)
You MUST generate a "visualization_code" object for each sub-question.

**THE "SINGLE QUOTE ONLY" SVG RULE**:
If using "svg_diagram", inside svgCode use SINGLE QUOTES for all SVG attributes.
- **ViewBox**: ALWAYS use \`<svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'>\`.
- **Coordinate Limit**: Keep all coordinates between -80 and 80.

# ZERO-COMPRESSION (五段式 — MANDATORY)
Each sub-question MUST include "zero_compression": { "given", "formula", "substitute", "derive", "answer" } (all strings, Traditional Chinese).

# Phase 3 — 內建視覺化類型（visualizations[]）
- stem_xy_chart: 實驗數據散佈或趨勢折線（chart_kind、x、y、軸標題）。
- biology_punnett_square: parent1_gametes, parent2_gametes 字串陣列。
- biology_pedigree: nodes + edges（譜系圖）。
- mermaid_flowchart: definition（代謝路徑等流程）。
- svg_diagram: 自訂 SVG 圖解。
- energy_level_diagram / periodic_table_highlight: 跨科觀念可選。

9. **Perfectly Paired Delimiters (CRITICAL FOR \\left and \\right)**:
Every \\left command MUST have a precisely matching \\right command within the SAME formula block.
    `.trim();
  }

  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Please grade the following student response based on the provided audit and expert analysis.
    User Preferences: ${instructions || 'Standard Grading'}

    # 🎯 CRITICAL POINT ALLOCATION (配分與評分精準度 - 極度重要)
    1. **Extract Exact Points**: Read the "Content" for keywords like "占 4 分", "每題 5 分", "(8分)", or "配分: 10".
    2. **Set max_points**: Set for EACH sub-question exactly. DO NOT default to 5.
    3. **Sub-score Distribution**: setup + process + result + logic ≤ max_points.

    # SCORING INSTRUCTION
    Score Summation Check: 'setup' + 'process' + 'result' + 'logic' MUST equal the achieved score.

    # OUTPUT JSON STRUCTURE (STRICT)
    {
      "final_score": 0,
      "max_score": 0,
      "remarks_zh": "Overall summary.",
      "growth_roadmap": ["Step 1...", "Step 2..."],
      "stem_sub_results": [
        {
          "sub_id": "Q1",
          "max_points": 4,
          "setup": 1.0,
          "process": 2.0,
          "result": 1.0,
          "logic": 0,
          "feedback": "【ASEA 評分與診斷】...",
          "concept_correction": "【💡 Campbell 級知識擴充】...",
          "alternative_solutions": ["Method 1...", "Method 2..."],
          "zero_compression": {
            "given": "已知條件與題幹重點…",
            "formula": "關係式或定律…",
            "substitute": "代入題目條件…",
            "derive": "逐步推理與機制…",
            "answer": "結論（含必要術語）…"
          },
          "correct_calculation": "Standard Answer (Use $$...$$)",
          "visualization_code": {
             "explanation": "🎨 圖像化記憶建議...",
             "visualizations": [
               {
                 "type": "svg_diagram",
                 "title": "Biological Mechanism Diagram",
                 "svgCode": "<svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'>...</svg>"
               }
             ]
          },
          "ceec_answer_sheet": null
        }
      ]
    }

    # CEEC 擬真作答區 (ceec_answer_sheet — OPTIONAL)
    MCQ: mode "mcq" + mcq.options / mcq.mode single|multi / correct_indices (0-based). Otherwise null.

    # Phase 4 — 圖像式微課程 (micro_lesson — OPTIONAL, null if N/A)
    - oxidation_timeline / color_oscillation / coordination_multiply

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}
    `;
  }
}
