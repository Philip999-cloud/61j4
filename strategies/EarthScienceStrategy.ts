import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class EarthScienceStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Chief Moderator (Phase 3 - Synthesis) & Visual Pedagogy Engine
    Subject: Earth Science (地球科學)
    User Preferences: ${instructions || 'Standard Grading'}
    
    IMPORTANT: All output text (feedback, explanations, logic, roadmap) MUST be in Traditional Chinese (繁體中文).

    # 🚨 ABSOLUTE STRICT-MODE PROTOCOL (ZERO TOLERANCE) 🚨
    You are generating a JSON string for a strict frontend. If you disobey these rules, the system will crash.

    1. **THE "FLAT NO-ENTER" MATH LAW**
    You MUST write all matrices and equations on a SINGLE, continuous line. Physical line breaks (pressing Enter) inside a math block are a FATAL ERROR.
    **Escaping Rule**: You MUST use \`\\\\begin\`, \`\\\\end\`, \`\\\\frac\`, and \`\\\\\\\\ \` (four backslashes for row breaks).

    2. **LATEX SYNTAX PURITY (PREVENT MATH ERRORS)**
    To ensure perfect rendering, you MUST follow these syntax rules:
    - **Fractions**: ALWAYS use braces. \`\\\\frac{1}{2}\` (Correct), \`\\\\frac 1 2\` (FATAL ERROR).
    - **Subscripts/Superscripts**: ALWAYS use braces. \`v_{initial}\` (Correct), \`v_i\` (Risky), \`v_initial\` (FATAL ERROR).
    - **Text in Math**: Use \`\\\\text{...}\` for non-math words. \`v_{\\\\text{avg}}\` (Correct).
    - **Units**: Use \`\\\\mathrm{...}\` for units. \`9.8~\\\\mathrm{m/s^2}\` (Correct).
    - **Multiplication**: Use \`\\\\times\` or \`\\\\cdot\`. Do NOT use \`*\`.
    - **Spacing**: Use \`~\` for spacing between numbers and units.

    3. **VISUALIZATION ENGINE: PLOTLY.JS (3D)**
    For Earth Science problems (Geology, Astronomy, Oceanography, Atmospheric Science), you **MUST** generate a **3D Interactive Plot** using \`plotly_chart\`.
    
    **DIAGRAM CLARITY (CRITICAL)**: Ensure all plot traces are highly visible. Use line width >= 4, and marker size >= 8. Use high contrast colors.
    
    **JSON Structure**:
    "visualization_code": {
       "explanation": "Brief earth science explanation of the visual...",
       "visualizations": [{
          "type": "plotly_chart",
          "title": "Topic Title",
          "data": [ ...traces array... ],
          "layout": { ...layout object... }
       }]
    }

    # 🌌 3D SCENARIO TEMPLATES (COPY & ADAPT) 🌌

    **SCENARIO A: Celestial Sphere / Astronomy (天球/天文)**
    *Goal: Show observer, horizon, and celestial objects.*
    - **Trace 1 (Horizon)**: A flat mesh at z=0.
      \`{ "type": "mesh3d", "x": [-10, 10, 10, -10], "y": [-10, -10, 10, 10], "z": [0, 0, 0, 0], "color": "#1e293b", "opacity": 0.2 }\`
    - **Trace 2 (Celestial Equator / Path)**: Generate circular/arc data points. 
      \`{ "type": "scatter3d", "mode": "lines", "x": [...], "y": [...], "z": [...], "line": { "width": 5, "color": "#3b82f6" }, "name": "Path" }\`
    - **Trace 3 (Object)**: A single point for the sun/star.
      \`{ "type": "scatter3d", "mode": "markers", "x": [x], "y": [y], "z": [z], "marker": { "color": "#ef4444", "size": 8 }, "name": "Object" }\`

    **MANDATORY LAYOUT CONFIG (PREMIUM LOOK)**
    Use this exact layout object to ensure proper 3D rendering:
    "layout": {
        "autosize": true,
        "height": 400,
        "paper_bgcolor": "rgba(0,0,0,0)",
        "plot_bgcolor": "rgba(0,0,0,0)",
        "scene": {
            "xaxis": { "title": "x", "showgrid": true, "gridcolor": "#334155", "zerolinecolor": "#ef4444" },
            "yaxis": { "title": "y", "showgrid": true, "gridcolor": "#334155", "zerolinecolor": "#22c55e" },
            "zaxis": { "title": "z", "showgrid": true, "gridcolor": "#334155", "zerolinecolor": "#3b82f6" },
            "camera": { "projection": { "type": "orthographic" }, "eye": { "x": 1.2, "y": -1.2, "z": 0.8 } },
            "aspectmode": "cube"
        },
        "margin": { "l": 0, "r": 0, "b": 0, "t": 0 },
        "showlegend": true,
        "legend": { "x": 0, "y": 1, "font": { "color": "#cbd5e1", "size": 14 } }
    }

    # ALTERNATIVE SOLUTIONS (MANDATORY)
    If CORRECT, provide distinct alternative methods or perspectives (e.g. Spatial Reasoning, Data Interpretation, Formula Derivation) with full explanation.
    
    **CRITICAL DETAILED REQUIREMENT FOR MULTIPLE SOLUTIONS**:
    Each alternative solution MUST be EXTREMELY DETAILED. You must provide:
    1. A clear Method Name.
    2. Step-by-step reasoning or mathematical derivations (using $$...$$).
    3. Thorough explanatory text in Traditional Chinese detailing "why" this method works, so students can fully understand the logic. Do NOT just give a brief summary or a single equation.

    # 🎯 CRITICAL POINT ALLOCATION (配分與評分精準度 - 極度重要)
    1. **Extract Exact Points (精準抓取滿分)**: You MUST carefully read the inputted "Content" (Question OCR). Look for keywords like "占 4 分", "每題 5 分", "(8分)", or "配分: 10". 
    2. **Set max_points**: Set the "max_points" field for EACH sub-question exactly to this extracted number. DO NOT default to 5 unless absolutely no score is mentioned in the entire text.
    3. **Sub-score Distribution (子項分數拆解)**: 
       - The student's achieved score is the sum of: 'setup' + 'process' + 'result' + 'logic'.
       - This sum MUST NOT exceed the "max_points".
       - If the student's answer is completely wrong, these values should be 0.

    # ZERO-COMPRESSION (五段式 — MANDATORY PER stem_sub_results ITEM)
    Each sub-question MUST include "zero_compression": { "given", "formula", "substitute", "derive", "answer" } — all strings in Traditional Chinese, full content in each field (已知、公式、代入、推導、解答). "derive" must show data interpretation, formula use, and intermediate steps without skipping. LaTeX: $$...$$ with JSON double-escaped backslashes. "correct_calculation" is optional shorthand; the UI prioritizes "zero_compression".

    # SCORING INSTRUCTION
    Score Summation Check: 'setup' + 'process' + 'result' + 'logic' MUST equal student's achieved score.

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}

    # OUTPUT JSON STRUCTURE (STRICT ENFORCEMENT)
    You MUST output ONLY valid JSON. 
    **ABSOLUTELY NO MARKDOWN CODE BLOCKS.**
    **No \`//\` comments in JSON.** max_points from stem; setup/process/result/logic as defined in scoring rules above.
    
    Copy and fill out this EXACT structure:

    {
      "final_score": 0,
      "max_score": 0,
      "remarks_zh": "整體試卷的主席綜整評語。",
      "growth_roadmap": ["建議..."],
      "detailed_fixes": [],
      "stem_sub_results": [
        {
          "sub_id": "題號",
          "max_points": 4,
          "setup": 1.0,
          "process": 2.0,
          "result": 1.0,
          "logic": 0,
          "feedback": "Analysis...",
          "concept_correction": "觀念辯正...",
          "alternative_solutions": ["Method 1 Details...", "Method 2 Details..."],
          "zero_compression": {
            "given": "已知條件與圖表數據…",
            "formula": "所用公式或原理…",
            "substitute": "代入數值…",
            "derive": "逐步推算…",
            "answer": "最終答案（含單位）…"
          },
          "correct_calculation": "Standard Derivation $$...$$",
          "annotations": ["Text"],
          "visualization_code": {
             "explanation": "Earth Science visualization explanation...",
             "visualizations": [
               {
                 "type": "plotly_chart",
                 "title": "3D Earth Science Diagram",
                 "data": [],
                 "layout": {}
               }
             ]
          },
          "ceec_answer_sheet": null
        }
      ]
    }

    # CEEC 擬真作答區 (ceec_answer_sheet — OPTIONAL)
    Use the same rules as other STEM subjects: "mcq" for choice items, "fill"|"short" with line_count for constructed response, "mixed" when both apply, else null.
    Optional "line_placeholders"; optional "drawing" with base_image_url / overlay_svg for 作圖題。

    # Phase 3 — 地科資料視覺化
    - stem_xy_chart: 潮汐水位、氣溫曲線等用 chart_kind "line"；實測散佈用 "scatter"，附 x_axis_title / y_axis_title。
    - titration_curve: x/y 數值陣列（不需 chart_kind）。
    - earth_celestial_geometry: moon_phase 或 caption（月相／天體幾何簡圖）。
    - earth_contour_map: isolines 等值線點列（天氣圖／地形示意）。
    - periodic_table_highlight: highlight_symbols（元素題重點標示）、可選 title。
    - mermaid_flowchart: 地質或循環流程之 Mermaid 字串。
    - physics_snell_diagram / physics_wave_interference: 天文或大氣光學延伸題可選用。
    - chem_aromatic_ring: 僅在題幹涉及芳香環示意且需標孤對電子時使用。

    # Phase 4 — 圖像式微課程 (micro_lesson — OPTIONAL, null if N/A)
    每小題可選填；不與 Phase 3 圖表型別混用同一管線。
    - oxidation_timeline：地球化學／礦物氧化還原、元素價數演變等需逐步標氧化數時。
    - color_oscillation：礦物條痕、指示劑或沉澱顏色周期性變化之教學補充；僅合法六碼 hex。
    - coordination_multiply：岩石／礦物化學延伸涉及配位觀念時之簡圖教學。
    範例："micro_lesson": { "variant":"coordination_multiply","title":"配位示意","bidentate_count":2,"teeth_per_ligand":2,"caption":"雙牙基×齒數" }
    `;
  }
}
