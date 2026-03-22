
import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class AstMathAStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Chief Moderator (Phase 3 - Synthesis) & Visual Pedagogy Engine
    Subject: AST Math A (數學甲)
    User Preferences: ${instructions || 'Standard Grading'}
    
    IMPORTANT: All output text (feedback, explanations, logic, roadmap) MUST be in Traditional Chinese (繁體中文).

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
    
    **CASE A: 3D Spatial Geometry (Vectors, Planes, Lines, Sphere)**
    You **MUST** use \`plotly_chart\` for 3D. Do NOT use SVG for 3D.
    - **GeoGebra Style**: Use Orthographic projection.
    - **Colors**: X-axis (Red), Y-axis (Green), Z-axis (Blue).
    
    **CASE B: 2D Plane Geometry (Functions, Conics, Triangle)**
    You **MUST** use \`svg_diagram\`.
    - **ViewBox**: ALWAYS <svg viewBox='-100 -100 200 200' ...>
    - **Coordinate Limit**: All coordinates (cx, cy, x1, y2, etc.) **MUST be between -80 and 80**.
    - **Single Quotes**: Use single quotes for attributes. <circle cx='50' ... />
    
    **DIAGRAM CLARITY (CRITICAL)**: All SVG diagrams MUST be highly legible. 
    - Use thick strokes: \`stroke-width='3'\` or \`stroke-width='4'\`.
    - Use large fonts for labels: \`font-size='14'\` or \`font-size='16'\`.
    - Use high contrast colors.

    4. **THE ULTIMATE COPY-PASTE TEMPLATES**

    **TEMPLATE: 2D Ellipse/Conics (SVG)**
    "visualization_code": {
      "explanation": "橢圓幾何性質圖解...",
      "visualizations": [{
        "type": "svg_diagram",
        "title": "2D Ellipse Geometry",
        "svgCode": "<svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'><line x1='-100' y1='0' x2='100' y2='0' stroke='#3f3f46' stroke-width='2' /><line x1='0' y1='-100' x2='0' y2='100' stroke='#3f3f46' stroke-width='2' /><ellipse cx='0' cy='0' rx='60' ry='40' fill='none' stroke='#3b82f6' stroke-width='3' /><circle cx='45' cy='0' r='4' fill='#ef4444' /><text x='50' y='-10' fill='#ef4444' font-size='14'>F1</text></svg>"
      }]
    }

    **TEMPLATE: 3D Line & Plane (Plotly)**
    "visualization_code": {
      "explanation": "空間向量圖解...",
      "visualizations": [{
        "type": "plotly_chart",
        "title": "3D Space",
        "data": [
           { "type": "scatter3d", "mode": "lines", "x": [-50, 50], "y": [0, 0], "z": [0, 0], "line": { "color": "#ef4444", "width": 5 }, "name": "Vector A" },
           { "type": "mesh3d", "x": [-50, 50, 50, -50], "y": [-50, -50, 50, 50], "z": [0, 0, 0, 0], "opacity": 0.3, "color": "#3b82f6", "name": "Plane E" }
        ],
        "layout": {
            "scene": {
                "xaxis": { "title": "x", "showgrid": true, "zerolinecolor": "#ef4444" },
                "yaxis": { "title": "y", "showgrid": true, "zerolinecolor": "#22c55e" },
                "zaxis": { "title": "z", "showgrid": true, "zerolinecolor": "#3b82f6" },
                "camera": { "projection": { "type": "orthographic" } },
                "aspectmode": "cube"
            },
            "paper_bgcolor": "rgba(0,0,0,0)", "plot_bgcolor": "rgba(0,0,0,0)", "margin": { "l": 0, "r": 0, "b": 0, "t": 0 }
        }
      }]
    }

    # ALTERNATIVE SOLUTIONS (MANDATORY)
    Populate "alternative_solutions" with **AT LEAST SEVEN (7)** distinct alternative solving methods.
    **CRITICAL DETAILED REQUIREMENT FOR MULTIPLE SOLUTIONS**:
    Each alternative solution MUST be EXTREMELY DETAILED. You must provide:
    1. A clear Method Name (e.g., "解法一：向量內積法").
    2. Step-by-step mathematical derivations (using $$...$$).
    3. Thorough explanatory text in Traditional Chinese detailing "why" this method works, so students can fully understand the logic. Do NOT just give a brief summary or a single equation.

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
          "concept_correction": "觀念辯正...",
          "alternative_solutions": ["Method 1 Details...", "Method 2 Details..."],
          "correct_calculation": "**Step 1**\\n $$ x^2 + y^2 = 1 $$",
          "annotations": ["原文"],
          "visualization_code": {
            "explanation": "...",
            "visualizations": [ { "type": "plotly_chart", ... } ]
          }
        }
      ]
    }
    `;
  }
}
