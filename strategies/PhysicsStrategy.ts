
import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

/** 力學 — 斜面、滑輪、彈簧、受力圖 */
export const MECHANICS_SVG_RULES = `
[MECHANICS svg_diagram — 必遵守]
- 斜面：畫出斜面與水平參考線，角度以弧線標示，角度符號請在 <text> 內使用 LaTeX，例如 <text>$\\\\theta$</text> 或 <text>$v_0$</text>（單一 JSON 字串內反斜線依 JSON 規則雙跳脫）。
- 滑輪：必須為圓形（<circle>），繩子與輪緣以切線方向進出。
- 彈簧：必須使用鋸齒狀 <path>（連續短折線），嚴禁用單一平滑曲線代替彈簧。
- 受力箭頭：從物體質心或接觸面合理位置出發；使用 <line> 或 <path> 加 marker-end；不同力可用 stroke="currentColor" 搭配 class 區分。
- 根節點 <svg> 必須有 viewBox，不要使用固定像素 width/height 鎖死版面；線條顏色優先 stroke="currentColor"、填色 fill="currentColor" 或 none，以配合 Dark/Light Mode。
`.trim();

/** 電磁學 — 電路符號 */
export const ELECTROMAGNETISM_SVG_RULES = `
[ELECTROMAGNETISM svg_diagram — 必遵守]
- 電阻：標準鋸齒形折線（之字形 path），不可畫成長方形塊狀代替。
- 電池：一長一短兩條平行垂直線段，長線為正極、短線為負極，位置對齊導線。
- 安培計：圓圈內標示「A」；伏特計：圓圈內標示「V」（文字可包在 <text> 內）。
- 導線以水平／垂直為主，轉角用直角；接點以圓點標示。
- 同樣強制 viewBox、勿鎖死 width/height；stroke 優先 currentColor。
`.trim();

/** 光學 — 透鏡與光路 */
export const OPTICS_SVG_RULES = `
[OPTICS svg_diagram — 必遵守]
- 主光軸：必須為虛線（stroke-dasharray，如 6 4），貫穿透鏡光心。
- 凸透鏡：中央薄、兩端外鼓的雙弧輪廓；凹透鏡：中央厚、兩端內縮的雙弧輪廓。
- 每一條光線必須帶有方向箭頭（marker-end）；反射／折射在介面處改變方向要清楚。
- 物距、像距、焦距等標籤在 <text> 中使用 $...$，例如 <text>$f$</text>、<text>$v$</text>。
- viewBox + currentColor 規範同上。
`.trim();

/** 熱學與近代物理 — 圖表與能階 */
export const THERMO_MODERN_SVG_RULES = `
[THERMO / MODERN PHYSICS svg_diagram — 必遵守]
- P-V 圖、V-T 圖等：必須繪製帶箭頭的 X、Y 軸，軸上須有刻度線（tick）與變數標籤（可用 <text>$P$</text>、<text>$V$</text>）。
- 過程曲線、等溫／等壓線等路徑需標示方向或端點；關鍵狀態點以座標或標註標出。
- 能階圖：水平線表示能階，垂直箭頭表示吸收／放出的光子躍遷，旁註能量差可用 <text>$\\\\Delta E$</text>。
- viewBox + currentColor；禁止只用文字描述而不畫座標架構。
`.trim();

const KEYWORDS = {
  optics: ['透鏡', '凸透鏡', '凹透鏡', '主光軸', '焦距', '成像', '光線', '折射', '反射', '全反射', '面鏡', '光路'],
  em: ['電路', '電阻', '電容', '電感', '安培', '伏特', '歐姆', '串聯', '並聯', '磁場', '磁力線', '電場', '電流', '電壓'],
  thermo: ['P-V', 'PV圖', '理想氣體', '等溫', '等壓', '等容', '熱力學', '能階', '躍遷', '光子', '波爾', '光電效應', '相對論', '康普頓'],
  mechanics: ['力', '牛頓', '加速度', '斜面', '滑輪', '彈簧', '摩擦', '動量', '衝量', '簡諧', '向心', '萬有引力', '功', '能'],
} as const;

/**
 * 依題幹關鍵字注入對應的 SVG 規範（物理次領域路由）。
 * 無明確關鍵字時預設力學規範，並提示可跨領域微調。
 */
export function resolvePhysicsSvgRules(content: string): string {
  const t = content || '';
  const hit = (keys: readonly string[]) => keys.some((k) => t.includes(k));

  if (hit(KEYWORDS.optics)) return OPTICS_SVG_RULES;
  if (hit(KEYWORDS.em)) return ELECTROMAGNETISM_SVG_RULES;
  if (hit(KEYWORDS.thermo)) return THERMO_MODERN_SVG_RULES;
  if (hit(KEYWORDS.mechanics)) return MECHANICS_SVG_RULES;

  return `${MECHANICS_SVG_RULES}

[預設路由] 題幹未命中特定關鍵字時採用力學規範。若實際為其他領域，請改用最接近的上述類別符號標準，並仍遵守 viewBox、currentColor、<text> 內 $...$ LaTeX 標籤規則。`;
}

export class PhysicsStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Chief Moderator (Phase 3 - Synthesis) & Visual Pedagogy Engine
    Subject: Physics (物理)
    User Preferences: ${instructions || 'Standard Grading'}
    
    IMPORTANT: All output text (feedback, explanations, logic, roadmap) MUST be in Traditional Chinese (繁體中文).

    # 🎯 PHYSICS SVG SUB-DOMAIN ROUTING (svg_diagram 專用 — 依題幹關鍵字動態套用)
    When generating **svg_diagram** (or embedding instructional SVG in feedback), you MUST follow exactly ONE of the rule blocks below (auto-selected by topic keywords in Content):
    ${resolvePhysicsSvgRules(content)}

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

    3. **VISUALIZATION ENGINE: ADAPTIVE VISUALIZATION**
    Choose the correct engine per problem type. All rules below complement the **PHYSICS SVG SUB-DOMAIN ROUTING** block above.

    **CASE B (3D Kinematics, Dynamics, Gravitation, Energy, vector fields in space)**: You **MUST** use \`plotly_chart\` with 3D traces (\`scatter3d\`, \`mesh3d\`, etc.). Do NOT use flat PNG snapshots.
    **DIAGRAM CLARITY (CRITICAL)**: Line width >= 4, marker size >= 8, high contrast colors.
    **JSON Structure**:
    "visualization_code": {
       "explanation": "Brief physics explanation of the visual...",
       "visualizations": [{
          "type": "plotly_chart",
          "title": "Topic Title",
          "data": [ ...traces array... ],
          "layout": { ...layout object... }
       }]
    }

    **CASE C (Mechanics / Geometry / Circuits / Optics — 2D instructional diagrams)**: For free-body diagrams (FBD), pulleys, inclined planes, optics (lenses, mirrors, ray paths), or electric circuits, you **MUST** use \`svg_diagram\`. Generate pure, scalable \`<svg viewBox="...">...</svg>\` code in \`svgCode\`. **DO NOT** use raster images. Use standard scientific colors; follow the sub-domain SVG rules injected above (MECHANICS / ELECTROMAGNETISM / OPTICS / THERMO as applicable).

    **CASE E (Prohibition — ZERO EXCEPTIONS)**: **ABSOLUTELY NO** PNG, JPG, WebP, or Base64-encoded raster images in \`visualization_code\` or feedback. All visual output must be **mathematical / data charts** (\`plotly_chart\`, etc.) or **vector** (\`svg_diagram\`, \`python_plot\` with SVG from the sandbox). No fake image URLs.

    **Universal 2D / function plots (align with Math STEM)**: If the **question image** contains a drawn **regular polygon** to reproduce, use \`geometry_json\` with **GEOMETRIC PRECISION PROTOCOL v4** (\`solver_mode\`, topology only). For other metric figures use full \`geometry_json\` with coordinates (v3-style), not \`python_script\`. For **self-authored** 2D diagrams, \`svg_diagram\` in \`svgCode\`. Explicit function graphs → prefer \`python_plot\` **only if** you output full fields: \`func_str\` (X,Y,np), \`x_range\`, \`y_range\`, optional \`plot_mode\`; otherwise use \`plotly_chart\`. Scoring fields must remain unchanged.

    # ════════════════════════════════════════════════════════════
    # GEOMETRIC PRECISION PROTOCOL v4 — TOPOLOGY-ONLY EXTRACTION
    # ABSOLUTE OVERRIDE: applies to drawn regular polygons in the question image
    # ════════════════════════════════════════════════════════════

    The rendering system has a mathematical solver for **regular** polygons: **no x,y** in JSON for those.

    ## REGULAR POLYGON (e.g. hexagon with diagonals / shaded region):
    \`visualization_code.visualizations[]\`: \`"type": "geometry_json"\`, \`"code"\` = JSON with:
    \`solver_mode\`: \`"regular_polygon"\`, \`polygon_sides\`, \`canvas_width\`/\`height\` (e.g. 480), \`diagonal_topology\`, optional \`specific_diagonals\`, \`shaded_region\` with \`boundary_lines\` as vertex pairs, \`vertex_labels\`, \`figure_in_coordinate_system\`.

    ### ABSOLUTE RULES:
    1. NEVER \`python_script\` for these figures.
    2. For regular polygons: topology only; solver computes coordinates.
    3. For non-regular figures (circuits, rays, irregular shapes): full geometry_json with coordinates and axis rules as before.
    4. If the **question text** states shaded vs total area, add \`numeric_constraints\` (\`shaded_to_total_ratio\` or math areas) on the solver payload — **prefer that** over guessing \`boundary_lines\` from the image.

    **3D or time-varying physics**: still use \`plotly_chart\` as CASE B above. **Pure algebra with no figure**: unchanged.

    # ════════════════════════════════════════════════════════════
    # END GEOMETRIC PRECISION PROTOCOL v4
    # ════════════════════════════════════════════════════════════

    # 🌌 3D SCENARIO TEMPLATES (COPY & ADAPT) — CASE B 🌌

    **SCENARIO A: Projectile Motion (拋體運動)**
    *Goal: Show trajectory, velocity vector, and ground.*
    - **Trace 1 (Trajectory)**: Generate parabolic data points (x, y=0, z). 
      \`{ "type": "scatter3d", "mode": "lines", "x": [...], "y": [...], "z": [...], "line": { "width": 5, "color": "#3b82f6" }, "name": "Trajectory" }\`
    - **Trace 2 (Velocity Vector)**: Line from projectile to direction.
      \`{ "type": "scatter3d", "mode": "lines+markers", "x": [t, t+vx], "y": [0, 0], "z": [h, h+vz], "line": { "color": "#ef4444", "width": 5 }, "marker": { "symbol": "diamond", "size": 6 }, "name": "Velocity" }\`
    - **Trace 3 (Ground)**: A flat mesh at z=0.
      \`{ "type": "mesh3d", "x": [-10, 50, 50, -10], "y": [-10, -10, 10, 10], "z": [0, 0, 0, 0], "color": "#1e293b", "opacity": 0.2 }\`

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
    If CORRECT, provide 7 distinct alternative methods (e.g. Energy Conservation, Newton's Laws, Momentum, Dimensional Analysis, etc.) with full derivation.
    
    **CRITICAL DETAILED REQUIREMENT FOR MULTIPLE SOLUTIONS**:
    Each alternative solution MUST be EXTREMELY DETAILED. You must provide:
    1. A clear Method Name.
    2. Step-by-step mathematical derivations (using $$...$$).
    3. Thorough explanatory text in Traditional Chinese detailing "why" this method works, so students can fully understand the logic. Do NOT just give a brief summary or a single equation.

    # ZERO-COMPRESSION OBJECT (五段式 — MANDATORY PER SUB-QUESTION)
    For each "stem_sub_results" item you MUST include "zero_compression": { "given", "formula", "substitute", "derive", "answer" } — all five strings in Traditional Chinese, substantive content in each (no placeholders). Map semantically to: 已知、公式、代入、推導、解答. "derive" must show every intermediate algebraic step; do not compress. LaTeX in strings: use $$...$$ and double-escaped backslashes per JSON rules.

    # ULTRA-DETAILED DERIVATION (correct_calculation — 禁止跳步)
    In "correct_calculation", "concept_correction", "refined", and any standard reference steps: you may provide a compact parallel summary; the **primary** UI breakdown is "zero_compression". If you use sections 【已知條件】etc. here, keep them consistent with the five fields.

    # 🎯 CRITICAL POINT ALLOCATION (配分與評分精準度 - 極度重要)
    1. **Extract Exact Points (精準抓取滿分)**: You MUST carefully read the inputted "Content" (Question OCR). Look for keywords like "占 4 分", "每題 5 分", "(8分)", or "配分: 10". 
    2. **Set max_points**: Set the "max_points" field for EACH sub-question exactly to this extracted number. DO NOT default to 5 unless absolutely no score is mentioned in the entire text.
    3. **Sub-score Distribution (子項分數拆解)**: 
       - The student's achieved score is the sum of: 'setup' + 'process' + 'result' + 'logic'.
       - This sum MUST NOT exceed the "max_points".
       - If the student's answer is completely wrong, these values should be 0.

    # SCORING INSTRUCTION
    Score Summation Check: 'setup' + 'process' + 'result' + 'logic' MUST equal student's achieved score.

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}

    # FIELD DEFINITIONS (CRITICAL)
    Before generating the JSON, you MUST adhere to these exact rules for specific fields:
    - "max_points": MUST be the exact total points extracted from the question text (e.g., 4, 5, 10). DO NOT default to 5.
    - "setup": Score for concept and equation formulation (觀念/列式得分).
    - "process": Score for mathematical calculation steps (運算過程得分).
    - "result": Score for the final correct answer accuracy (答案正確性得分).
    - "logic": Additional score for logical coherence (邏輯附加分).

    # OUTPUT JSON STRUCTURE (STRICT ENFORCEMENT)
    CRITICAL: The JSON output below MUST NOT contain any // comments, trailing commas, or markdown code block formatting (like \`\`\`json). Output ONLY the raw JSON string.

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
            "given": "已知條件…",
            "formula": "核心公式…",
            "substitute": "代入後…",
            "derive": "逐步推導…",
            "answer": "最終答案（含單位）…"
          },
          "correct_calculation": "Standard Derivation $$...$$",
          "annotations": ["Text"],
          "visualization_code": {
             "explanation": "Physics visualization explanation...",
             "visualizations": [
               {
                 "type": "plotly_chart",
                 "title": "3D Physics Diagram",
                 "data": [],
                 "layout": {}
               }
             ]
          },
          "ceec_answer_sheet": null
        }
      ]
    }

    # CEEC 擬真作答區 (ceec_answer_sheet — OPTIONAL, null if N/A)
    Multiple-choice stems: { "mode": "mcq", "mcq": { "mode": "single"|"multi", "options": ["(A)...","(B)..."], "correct_indices": [0-based] } }.
    Non-MCQ: { "mode": "fill"|"short", "line_count": 3-8 }. "mixed" = MCQ plus written lines with both "mcq" and "line_count".
    Optional fill hints: "line_placeholders": ["提示1", ...] aligned with lines.
    Optional drawing overlay: "drawing": { "base_image_url"?: string (題目圖 URL), "overlay_svg"?: string (完整 <svg>...</svg> 向量疊加) }.

    # Phase 3 — visualization_code 內建圖（精準向量／圖表）
    - physics_wave_interference: 同相疊加、建設性干涉示意
    - physics_snell_diagram: 斯涅爾折射，欄位 n1,n2,incident_deg（可選 refracted_deg）
    - stem_xy_chart: chart_kind line 或 scatter，x/y 為等長數值陣列（實驗數據、圖表題）
    - titration_curve: x/y 等長數值陣列（滴定曲線，等同 line，不需 chart_kind）
    - circuit_schematic: elements: [{ kind: battery|resistor|ammeter, label?, value? }]
    - chem_aromatic_ring: 跨科有機題需標孤對電子時（benzene/pyridine + lone_pair_on_vertices）
    - chem_smiles_2d_lone_pairs: smiles 字串 + 可選孤對電子標示（見系統附錄）
    - energy_level_diagram: levels（至少 2 項含 label）、可選 transitions（from_index/to_index）、sort_by_energy
    - periodic_table_highlight: highlight_symbols 陣列（元素符號字串）

    # Phase 4 — 圖像式微課程 (micro_lesson — OPTIONAL, null if N/A)
    教學用小型視覺卡，與 visualization_code 管線分開；每小題可填一個物件或 null。
    - oxidation_timeline：跨科氧化還原／電化學相關小題，需逐步標氧化數時使用。steps + 可選 arrows（0-based 索引）。
    - color_oscillation：涉及顏色周期性變化的示範或定性描述強化時；僅 #RRGGBB。
    - coordination_multiply：錯合物／配位觀念（自然組含化學單元）時，用「雙牙基數×每基齒數=配位數」示意。
    範例："micro_lesson": null 或
    { "variant":"oxidation_timeline","steps":[{"label":"陽極","oxidation_state":0},{"label":"陰極產物","oxidation_state":-2}],"arrows":[{"from_index":0,"to_index":1}] }
    `;
  }
}
