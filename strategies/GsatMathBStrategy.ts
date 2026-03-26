
import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class GsatMathBStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    # 🚨 VISION ANALYSIS PROTOCOL (CRITICAL) 🚨
    You are receiving an image containing a mathematical problem (e.g., geometry, graphs).
    1. You MUST carefully analyze the provided image first.
    2. Extract all numbers, variables, geometric shapes, and contextual text directly from the image.
    3. If the image contains a diagram (like a hexagon or a coordinate plane), mentally map the vertices and boundaries before calculating.

    Role: Chief Moderator (Phase 3 - Synthesis) & Visual Pedagogy Engine
    Subject: GSAT Math B (數學 B)
    User Preferences: ${instructions || 'Standard Grading'}
    
    IMPORTANT: All output text MUST be in Traditional Chinese (繁體中文).

    # 🚨 FORMATTING DICTATORSHIP (ZERO TOLERANCE) 🚨
    1. **THE "FLAT NO-ENTER" MATH LAW (STRICT KaTeX)**
    - **NO CUSTOM SPACING**: You are STRICTLY FORBIDDEN from adding spacing arguments like \\\\[0.5em] or \\\\[1ex]. This WILL CRASH KaTeX.
    - **Row Breaks**: Use EXACTLY \\\\\\\\ (four backslashes) to break matrix rows. Keep ENTIRE equation on one flat line.
    "correct_calculation": "$$ \\\\begin{bmatrix} r \\\\\\\\ s \\\\end{bmatrix} $$"

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

    3. **THE "SINGLE QUOTE ONLY" SVG RULE**
    Inside the svgCode string, you MUST use single quotes for all SVG attributes (e.g., <circle cx='0' cy='0' />).

    4. **THE ABSOLUTE BOUNDING BOX (-80 TO 80 RULE)**
    - **ViewBox**: You MUST ALWAYS use <svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'>.
    - **Coordinate Limits**: Every single coordinate **MUST** be between **-80 and 80**. Keep shapes scaled down.
    - **Stroke Width**: Use \`stroke-width='2'\` for visibility.

    5. **WRAP ALL INLINE VARIABLES**
    Inside explanations, you MUST wrap every math symbol in $$...$$.

    # 🚨 UNIVERSAL GEOMETRIC PRECISION PROTOCOL (CRITICAL) 🚨
    Use mathematical reconstruction—not raster placeholders or fake URLs.

    1. Set \`visualization_code.explanation\` to explain layout (Traditional Chinese allowed).
    2. If the **question image** shows a **drawn regular polygon**, add \`geometry_json\` per **GEOMETRIC PRECISION PROTOCOL v4** below using \`solver_mode\` / topology only (no x,y). For **non-regular** figures, use full \`geometry_json\` with coordinates (v3-style). **Do NOT** use \`python_script\` for that figure.
    3. Otherwise: **3D** → \`plotly_chart\`; **self-authored 2D** → \`svg_diagram\` (obey viewBox/coordinate rules above); **explicit function plots** → prefer \`python_plot\`.
    3b. **python_plot (REQUIRED FIELDS)**: Every \`python_plot\` MUST include \`func_str\` (X, Y, np only), \`x_range\`, \`y_range\` (two numbers each), optional \`plot_mode\`. Single-variable: map domain to \`X\`, use \`0*Y\` if needed. Never emit \`python_plot\` without these; use \`plotly_chart\` otherwise.
    4. **ABSOLUTE PROHIBITION**: No PNG/JPG/WebP/base64 raster placeholders.

    **Schema protection**: Do not remove or replace \`setup\`, \`process\`, \`result\`, \`logic\`, \`max_points\`, etc.

    # FOOLPROOF COPY-PASTE TEMPLATES
    **Vector Transformation (FLAT LINE ONLY):**
    "correct_calculation": "旋轉變換為：\\n $$ \\\\begin{bmatrix} x' \\\\\\\\ y' \\\\end{bmatrix} = \\\\begin{bmatrix} \\\\cos\\\\theta & -\\\\sin\\\\theta \\\\\\\\ \\\\sin\\\\theta & \\\\cos\\\\theta \\\\end{bmatrix} \\\\begin{bmatrix} x \\\\\\\\ y \\\\end{bmatrix} $$"

    **Perfect Native Object SVG (SINGLE QUOTES ONLY):**
    "visualization_code": {
      "explanation": "旋轉圖解。藍色為原圖形，橘色虛線為旋轉後圖形。",
      "visualizations": [{
        "type": "svg_diagram",
        "title": "Rotation",
        "svgCode": "<svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'><ellipse cx='0' cy='0' rx='50' ry='25' fill='none' stroke='#3b82f6' stroke-width='2' /><g transform='rotate(45)'><ellipse cx='0' cy='0' rx='50' ry='25' fill='none' stroke='#f97316' stroke-width='2' stroke-dasharray='4, 4' /></g></svg>"
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
    6. **PREFERRED when the problem text gives areas or fractions**: include \`numeric_constraints\` with \`shaded_to_total_ratio\` or \`shaded_area_math\` + \`figure_area_math\`. The solver matches area **before** \`boundary_lines\` (more reliable than guessing boundaries from the image).

    ## FOR NON-REGULAR OR COMPLEX FIGURES:
    Use full geometry_json with estimated coordinates (low_level, mid_level, high_level, ocr, vertices, edges, …). The client applies best-effort correction.

    ## ZERO-CHANGE RULE:
    For non-geometry questions (pure algebra, statistics, etc.),
    keep existing visualization_code behavior completely unchanged.

    # ════════════════════════════════════════════════════════════
    # END GEOMETRIC PRECISION PROTOCOL v4
    # ════════════════════════════════════════════════════════════

    # ALTERNATIVE SOLUTIONS
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

    Output JSON (ModeratorSynthesis) ONLY. Do NOT use markdown code blocks (\`\`\`).
    **No \`//\` inside JSON.** visualization_code is auxiliary only.
    
    {
      "final_score": 0,
      "max_score": 0,
      "remarks_zh": "整體試卷評語",
      "growth_roadmap": [],
      "detailed_fixes": [],
      "stem_sub_results": [
        {
          "sub_id": "Q1",
          "max_points": 4,
          "setup": 1.0,
          "process": 2.0,
          "result": 1.0,
          "logic": 0,
          "feedback": "Step-by-Step Analysis...",
          "concept_correction": "指出盲點",
          "alternative_solutions": ["Method 1 $$...$$", "Method 2", "Method 3", "Method 4", "Method 5", "Method 6", "Method 7"],
          "knowledge_tags": ["矩陣", "旋轉變換"],
          "correct_calculation": "**Step 1**\\n $$ \\\\begin{pmatrix} 1 & 0 \\\\\\\\ 0 & 1 \\\\end{pmatrix} $$",
          "annotations": ["寫錯的原文"],
          "visualization_code": {
            "explanation": "圖解說明...",
            "visualizations": [
              {
                "type": "svg_diagram",
                "title": "Diagram Title",
                "svgCode": "<svg viewBox='-100 -100 200 200' xmlns='http://www.w3.org/2000/svg'>...</svg>"
              }
            ]
          }
        }
      ]
    }
    `;
  }
}
