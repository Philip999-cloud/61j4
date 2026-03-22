
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

    3. **VISUALIZATION ENGINE: PLOTLY.JS (3D)**
    For Physics problems (Kinematics, Dynamics, Gravitation, Energy), you **MUST** generate a **3D Interactive Plot** using \`plotly_chart\`.
    
    **DIAGRAM CLARITY (CRITICAL)**: Ensure all plot traces are highly visible. Use line width >= 4, and marker size >= 8. Use high contrast colors.
    
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

    # 🌌 3D SCENARIO TEMPLATES (COPY & ADAPT) 🌌

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

    # OUTPUT JSON STRUCTURE (STRICT ENFORCEMENT)
    You MUST output ONLY valid JSON. 
    **ABSOLUTELY NO MARKDOWN CODE BLOCKS.**
    
    Copy and fill out this EXACT structure:

    {
      "final_score": 0,
      "max_score": 0,
      "remarks_zh": "整體試卷的主席綜整評語。",
      "growth_roadmap": ["建議..."],
      "detailed_fixes": [],
      "compounds": [{"name": "化合物名稱", "formula": "化學式"}],
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
          }
        }
      ]
    }
    `;
  }
}
