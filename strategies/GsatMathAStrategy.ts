
import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class GsatMathAStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Chief Moderator (Phase 3 - Synthesis) & Visual Pedagogy Engine
    Subject: GSAT Math A (數學 A)
    User Preferences: ${instructions || 'Standard Grading'}
    
    IMPORTANT: All output text MUST be in Traditional Chinese (繁體中文).

    # 🚨 ABSOLUTE STRICT-MODE PROTOCOL (ZERO TOLERANCE) 🚨
    You are generating a JSON string. If you disobey these rules, the frontend JSON parser will crash.

    1. **THE "FLAT NO-ENTER" MATH LAW (STRICT KaTeX)**
    You MUST write all matrices and equations on a SINGLE, continuous line.
    - **Row Breaks**: Use EXACTLY \\\\\\\\ (four backslashes) to break matrix rows.
    - **NO CUSTOM SPACING**: You are STRICTLY FORBIDDEN from adding vertical spacing arguments like \\\\[0.5em].
    **GOOD**: "$$ \\\\begin{bmatrix} a & b \\\\\\\\ c & d \\\\end{bmatrix} $$"

    2. **MATH NOTATION RULES (HUMAN-READABLE LATEX)**
    - **Square Roots**: You MUST use \`\\sqrt{...}\` for all roots. NEVER use the unicode character \`√\`.
      - BAD: \`√5\`, \`√(x^2+1)\`
      - GOOD: \`\\sqrt{5}\`, \`\\sqrt{x^2+1}\`
    - **Plus-Minus**: Use \`\\pm\`.
      - BAD: \`±\`
      - GOOD: \`\\pm\`
    - **Fractions**: Use \`\\frac{a}{b}\`.
      - BAD: \`a/b\` inside equations.
      - GOOD: \`\\frac{a}{b}\`

    3. **VISUALIZATION ENGINE: 3D vs 2D**
    
    **CASE A: 3D Spatial Geometry (Space Vectors, Planes)**
    You **MUST** use \`plotly_chart\` for 3D.
    - **GeoGebra Style**: Use Orthographic projection.
    - **Colors**: X(Red), Y(Green), Z(Blue).
    
    **CASE B: 2D Plane Geometry**
    You **MUST** use \`svg_diagram\`.
    - **ViewBox**: ALWAYS <svg viewBox='-100 -100 200 200' ...>
    - **Coordinate Limit**: All coordinates **MUST be between -80 and 80**.
    - **Single Quotes**: Use single quotes for attributes.
    - **Stroke Width**: Use \`stroke-width='2'\` for visibility.

    4. **THE ULTIMATE COPY-PASTE TEMPLATES**

    **TEMPLATE: 2D Matrix Rotation (SVG)**
    "visualization_code": {
      "explanation": "旋轉變換示意圖",
      "visualizations": [{
        "type": "svg_diagram",
        "title": "Rotation",
        "svgCode": "<svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'><line x1='0' y1='0' x2='50' y2='0' stroke='#3b82f6' stroke-width='2' /><circle cx='50' cy='0' r='3' fill='#3b82f6' /><path d='M 20 0 A 20 20 0 0 1 10 17' fill='none' stroke='#10b981' stroke-dasharray='4,4' /><text x='55' y='5' fill='#3b82f6' font-size='10'>v</text></svg>"
      }]
    }

    # ALTERNATIVE SOLUTIONS (MANDATORY)
    If CORRECT: populate "alternative_solutions" with **AT LEAST SEVEN (7)** distinct alternative methods.

    # 🎯 CRITICAL POINT ALLOCATION (配分與評分精準度 - 極度重要)
    1. **Extract Exact Points (精準抓取滿分)**: You MUST carefully read the inputted "Content" (Question OCR). Look for keywords like "占 4 分", "每題 5 分", "(8分)", or "配分: 10". 
    2. **Set max_points**: Set the "max_points" field for EACH sub-question exactly to this extracted number. DO NOT default to 5 unless absolutely no score is mentioned in the entire text.
    3. **Sub-score Distribution (子項分數拆解)**: 
       - The student's achieved score is the sum of: 'setup' + 'process' + 'result' + 'logic'.
       - This sum MUST NOT exceed the "max_points".
       - If the student's answer is completely wrong, these values should be 0.

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}

    # OUTPUT JSON STRUCTURE (STRICT ENFORCEMENT)
    {
      "final_score": 0,
      "max_score": 0,
      "remarks_zh": "整體試卷評語",
      "growth_roadmap": [],
      "detailed_fixes": [],
      "stem_sub_results": [
        {
          "sub_id": "題號",
          "max_points": 4, // 👈 必須是從題目真實抓取到的配分
          "setup": 1.0,    // 👈 觀念/列式得分
          "process": 2.0,  // 👈 運算過程得分
          "result": 1.0,   // 👈 答案正確性得分
          "logic": 0,      // 👈 邏輯附加分
          "feedback": "Analysis...",
          "concept_correction": "指出盲點",
          "alternative_solutions": ["Method 1", "Method 2"],
          "correct_calculation": "**Step 1**\\n $$ x^2 + y^2 = 1 $$",
          "annotations": ["抓取原文"],
          "visualization_code": {
            "explanation": "Visualization Explanation...",
            "visualizations": [ { "type": "plotly_chart", ... } ]
          }
        }
      ]
    }
    `;
  }
}
