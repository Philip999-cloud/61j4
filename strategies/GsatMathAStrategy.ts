
import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class GsatMathAStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    # 🚨 VISION ANALYSIS PROTOCOL (CRITICAL) 🚨
    You are receiving an image containing a mathematical problem (e.g., geometry, graphs).
    1. You MUST carefully analyze the provided image first.
    2. Extract all numbers, variables, geometric shapes, and contextual text directly from the image.
    3. If the image contains a diagram (like a hexagon or a coordinate plane), mentally map the vertices and boundaries before calculating.

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
    If the **question image** contains a **printed diagram**, use \`geometry_json\` per **GEOMETRIC PRECISION PROTOCOL v4** below. For **self-authored** 2D sketches, use \`svg_diagram\` (viewBox -100..100, coordinates -80..80, single quotes, visible stroke width).

    # 🚨 UNIVERSAL GEOMETRIC PRECISION PROTOCOL (CRITICAL) 🚨
    Use mathematical reconstruction—not raster placeholders or fake URLs.

    1. Set \`visualization_code.explanation\` to explain layout (Traditional Chinese allowed).
    2. If the **question image** shows a **drawn regular polygon** (e.g. regular hexagon), add \`geometry_json\` per **GEOMETRIC PRECISION PROTOCOL v4** below using \`solver_mode\` / topology only (no x,y). For **non-regular** complex figures, use full \`geometry_json\` with estimated coordinates (v3-style). **Do NOT** use \`python_script\` for that figure.
    3. Otherwise: **3D** → \`plotly_chart\`; **self-authored 2D** → \`svg_diagram\`; **explicit function plots** → prefer \`python_plot\`.
    3b. **python_plot (REQUIRED FIELDS)**: Same as AstMathA: every \`python_plot\` MUST include \`func_str\` (X, Y, np only), \`x_range\`, \`y_range\` (two numbers each), optional \`plot_mode\` \`"2d"\`|\`"3d"\`. Single-variable plots: use \`X\` for the domain variable and \`0*Y\` if needed. Never emit empty \`python_plot\`; use \`plotly_chart\` if fields cannot be filled.
    4. **ABSOLUTE PROHIBITION**: No PNG/JPG/WebP/base64 raster placeholders.

    **Schema protection**: Do not remove or replace \`setup\`, \`process\`, \`result\`, \`logic\`, \`max_points\`, etc.

    5. **THE ULTIMATE COPY-PASTE TEMPLATES**

    **TEMPLATE: 2D Matrix Rotation (SVG)**
    "visualization_code": {
      "explanation": "旋轉變換示意圖",
      "visualizations": [{
        "type": "svg_diagram",
        "title": "Rotation",
        "svgCode": "<svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'><line x1='0' y1='0' x2='50' y2='0' stroke='#3b82f6' stroke-width='2' /><circle cx='50' cy='0' r='3' fill='#3b82f6' /><path d='M 20 0 A 20 20 0 0 1 10 17' fill='none' stroke='#10b981' stroke-dasharray='4,4' /><text x='55' y='5' fill='#3b82f6' font-size='10'>v</text></svg>"
      }]
    }

    # ════════════════════════════════════════════════════════════
    # GEOMETRIC PRECISION PROTOCOL v4 — TOPOLOGY-ONLY EXTRACTION
    # ABSOLUTE OVERRIDE: applies to ALL geometry figure questions
    # ════════════════════════════════════════════════════════════

    CRITICAL ARCHITECTURE CHANGE:
    The rendering system has a mathematical solver for **regular** polygons.
    You DO NOT provide pixel coordinates for those — they are computed automatically.
    Your job is **TOPOLOGY EXTRACTION** only (what connects to what, shaded region boundaries).

    ## FOR REGULAR POLYGONS (正多邊形題):
    Add visualization_code.visualizations[] item: \`"type": "geometry_json"\`, \`"code"\` = JSON object or string with **TOPOLOGY ONLY** (no x,y):

    {
      "solver_mode": "regular_polygon",
      "polygon_sides": <number>,
      "canvas_width": 480,
      "canvas_height": 480,
      "diagonal_topology": "all" | "long_only" | "some" | "none",
      "specific_diagonals": [["A","C"], ...] | null,
      "shaded_region": {
        "exists": true,
        "fill_color": "#fef08a",
        "boundary_lines": [["A","D"], ["B","F"], ["A","F"]],
        "positional": null,
        "vertex_sequence": null
      },
      "vertex_labels": ["A","B","C","D","E","F"],
      "figure_in_coordinate_system": false,
      "numeric_constraints": {
        "shaded_to_total_ratio": 0.1667,
        "shaded_to_total_tolerance": 0.05
      }
    }

    ### ABSOLUTE RULES:
    1. NEVER use "python_script" — FORBIDDEN. 3D rendering destroys accuracy.
    2. For regular polygons: DO NOT provide x,y coordinates. Use solver_mode.
    3. figure_in_coordinate_system: true ONLY if numbered X/Y axes are visible. Standalone shapes = false.
    4. diagonal_topology: "all" | "long_only" | "some" (with specific_diagonals) | "none".
    5. boundary_lines: vertex letter pairs that bound the shaded region; the solver computes exact intersections.
    6. **PREFERRED when the problem text gives areas or fractions**: include \`numeric_constraints\` with \`shaded_to_total_ratio\` (e.g. shaded area ÷ whole polygon area) or \`shaded_area_math\` + \`figure_area_math\` in the same units. The client solver uses this **before** \`boundary_lines\`, which is more stable than vision-only boundary guesses.

    ## FOR NON-REGULAR OR COMPLEX FIGURES:
    Use full geometry_json with estimated coordinates (low_level, mid_level, high_level, ocr, vertices, edges, …). The client applies best-effort correction.

    ## ZERO-CHANGE RULE:
    For non-geometry questions (pure algebra, statistics, etc.),
    keep existing visualization_code behavior completely unchanged.

    # ════════════════════════════════════════════════════════════
    # END GEOMETRIC PRECISION PROTOCOL v4
    # ════════════════════════════════════════════════════════════

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
          // visualization_code 僅輔助圖示，不得刪減或取代上列評分欄位
        }
      ]
    }
    `;
  }
}
