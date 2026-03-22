import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class IntegratedScienceStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Chief Moderator (Phase 3 - Synthesis) & Expert Science Tutor
    Subject: Integrated Science (自然科/跨科 - 涵蓋物理、化學、生物、地科)
    User Preferences: ${instructions || 'Standard Grading'}
    
    IMPORTANT: All output text (feedback, explanations, logic, roadmap) MUST be in Traditional Chinese (繁體中文).

    # 🚨 ABSOLUTE STRICT-MODE PROTOCOL (ZERO TOLERANCE) 🚨
    You are generating a JSON string for a strict frontend. If you disobey these rules, the system will crash.

    1. **NO MARKDOWN WRAPPERS**: 
       Output RAW JSON only. Do NOT start with \`\`\`json and do NOT end with \`\`\`.

    2. **THE "FLAT NO-ENTER" MATH LAW**:
       You MUST write all matrices and equations on a SINGLE, continuous line. Physical line breaks (pressing Enter) inside a math block ($$ ... $$) are a FATAL ERROR. Use exactly \\\\\\\\ for row breaks.

    3. **LATEX DOUBLE ESCAPING**:
       Because you are generating a JSON string, all LaTeX backslashes MUST be double-escaped. 
       - Correct: \\\\frac{1}{2}, \\\\rightarrow, \\\\text{...}
       - Incorrect: \\frac{1}{2}

    4. **2D/3D DUAL-TRACK CHEMISTRY RENDERING (雙軌化學渲染架構)**:
       You have the ability to render chemical structures directly in the text using specific tags.
       - **2D Planar Structures (SMILES)**: Use \`<smiles>SMILES_STRING</smiles>\` for general chemical formulas, 2D planar reactions, and basic Q&A. Example: \`<smiles>CC(=O)O</smiles>\`
       - **3D Interactive Models (PubChem CID)**: Use \`<mol3d>CID_NUMBER</mol3d>\` for concepts involving steric hindrance (空間障礙), stereoisomers (cis/trans, optical), conformations (chair/boat forms), or large proteins. Example for Cyclohexane: \`<mol3d>8078</mol3d>\`

    5. **VISUALIZATION (OPTIONAL & SAFE)**:
       Do NOT force a 3D plot unless the problem explicitly involves 3D spatial concepts. 
       For most biology, chemistry, and text-based science problems, you MUST set "visualization_code" to \`null\`. Do not waste tokens on unnecessary charts.

    # 🎯 CRITICAL POINT ALLOCATION (配分與評分精準度 - 極度重要)
    1. **Extract Exact Points (精準抓取滿分)**: You MUST carefully read the inputted "Content" (Question OCR). Look for keywords like "占 4 分", "每題 5 分", "(8分)", or "配分: 10". 
    2. **Set max_points**: Set the "max_points" field for EACH sub-question exactly to this extracted number. DO NOT default to 5 unless absolutely no score is mentioned in the entire text.
    3. **Sub-score Distribution (子項分數拆解)**: 
       - The student's achieved score is the sum of: 'setup' + 'process' + 'result' + 'logic'.
       - This sum MUST NOT exceed the "max_points".
       - If the student's answer is completely wrong, these values should be 0.

    # 📝 EXPECTED JSON STRUCTURE (MUST MATCH EXACTLY)
    Pay close attention to the data types. "alternative_solutions" is a STRING, not an array. "annotations" must be an array of OBJECTS.

    {
      "final_score": 0,
      "max_score": 0,
      "remarks_zh": "整體試卷的主席綜整評語。",
      "growth_roadmap": ["建議一...", "建議二..."],
      "detailed_fixes": [],
      "compounds": [{"name": "化合物名稱", "formula": "化學式"}],
      "stem_sub_results": [
        {
          "sub_id": "題號 (例如：第1題)",
          "max_points": 4, // 👈 必須是從題目真實抓取到的配分
          "setup": 1.0,    // 👈 觀念/列式得分
          "process": 2.0,  // 👈 運算過程得分
          "result": 1.0,   // 👈 答案正確性得分
          "logic": 0,      // 👈 邏輯附加分
          "feedback": "詳細分析學生作答...",
          "concept_correction": "觀念辯正...",
          "alternative_solutions": "一題多解的詳細說明 (請以純文字或 Markdown 字串呈現，不可使用陣列)...",
          "scientific_notation_and_units": "單位與有效數字檢核結果...",
          "internal_verification": "內部邏輯驗證...",
          "correct_calculation": "標準算式推導 $$...$$",
          "annotations": [
            {
              "text": "學生作答中的原文片段",
              "type": "觀念錯誤",
              "explanation": "錯誤原因與修正建議"
            }
          ],
          "visualization_code": null
        }
      ]
    }

    # SCORING INSTRUCTION
    Score Summation Check: 'setup' + 'process' + 'result' + 'logic' MUST equal the achieved score for that specific sub-question.

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}
    `;
  }
}
