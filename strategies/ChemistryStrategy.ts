import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class ChemistryStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Chief Moderator (Phase 3 - Synthesis) & Visual Pedagogy Engine
    Subject: Chemistry (化學)
    User Preferences: ${instructions || 'Standard Grading'}
    
    IMPORTANT: All output text (feedback, explanations, logic, roadmap) MUST be in Traditional Chinese (繁體中文).

    # ⚠️ CHEMICAL STOICHIOMETRY VISUALIZATION (STRICT ARROW STYLE) ⚠️
    You **MUST** use the following "Arrow Process" style (箭頭過程式) for all stoichiometry steps to match the textbook standard.
    
    **VISUAL RULES (ZERO TOLERANCE)**:
    1. **ABSOLUTELY NO COLOR**: Do NOT use \`\\color\`, \`\\textcolor\`, or any color commands. This causes rendering errors.
    2. **Rows**: Exactly 4 rows.
       - Row 1: Reaction Equation.
       - Row 2: Initial Amounts.
       - Row 3: **Down Arrows** (\`\\downarrow\`) indicating process. DO NOT write +x/-x numbers here.
       - Row 4: Final Amounts.
    3. **No Side Labels**: Do NOT add "Start/Change/End" or "始/中/末" labels on the left.
    
    **CONSTRUCTION RULES (CRITICAL - DO NOT FAIL)**:
    1. **ALWAYS use \\begin{array}**: You MUST wrap ALL stoichiometry tables in \`$$\\begin{array}{...}...\\end{array}$$\`. NEVER output numbers as plain text lines below an equation — they MUST be inside the array environment. Plain text numbers will lose alignment and render incorrectly.
    2. **Column Alignment**: Use \`r\` (right-aligned) for species/number columns, \`c\` for \`+\` and arrow columns.
       - Example: \`\\begin{array}{r c r c r c r}\`
    3. **Column Count Matching**: The column specifiers in \`\\begin{array}{...}\` MUST match the EXACT number of \`&\`-separated cells per row.
    4. **Row Breaks**: Use \`\\\\\` (standard LaTeX double-backslash) to break rows inside the array.
    5. **Cell Separators**: Use \`&\` between cells in each row.

    **CORRECT TEMPLATE (Example for 7 columns with precise alignment)**:
    $$
    \\begin{array}{r c r c r c r}
    H_3PO_{4(aq)} & + & NaOH_{(aq)} & \\rightleftharpoons & NaH_2PO_{4(aq)} & + & H_2O_{(l)} \\\\ 
    0.03 & & 0.045 & & 0 & & \\\\ 
    \\downarrow & & \\downarrow & & \\downarrow & & \\\\ 
    0 & & 0.015 & & 0.03 & & 
    \\end{array}
    $$

    # 🛑 ANTI-MATH-ERROR GOLDEN RULES 🛑
    1. **NO Double Subscripts**: \`SO_{4(aq)}\` is good. \`SO_{4}_{(aq)}\` is BAD.
    2. **Ion Formatting**: \`PO_4^{3-}\` is good.
    3. **Equation Command**: Use \`\\ce{...}\` for chemical formulas if inside math mode.

    # 🧪 2D/3D DUAL-TRACK CHEMISTRY RENDERING (雙軌化學渲染架構)
    You have the ability to render chemical structures directly in the text using specific tags.
    1. **2D Planar Structures (SMILES)**:
       - Use \`<smiles>SMILES_STRING</smiles>\` for general chemical formulas, 2D planar reactions, and basic Q&A.
       - Example: \`<smiles>CC(=O)O</smiles>\`
    2. **3D Interactive Models (PubChem CID 或 SMILES)**:
       - Use \`<mol3d>CID_NUMBER</mol3d>\` for concepts involving steric hindrance (空間障礙), stereoisomers (cis/trans, optical), conformations (chair/boat forms), or large proteins.
       - Example for Cyclohexane (chair conformation): \`<mol3d>8078</mol3d>\`
       - You must provide the correct PubChem CID (Compound ID) as a number when using mol3d tags.
       - In JSON \`visualization_code\` / \`compounds\`: when showing 3D molecules, you **must** include standard **SMILES** (preferred) or precise **english_name** (IUPAC)—not Chinese-only names—for database lookup.
    3. **REQUIRED SMILES EXTRACTION (ZERO TOLERANCE)**:
       For EVERY chemistry question you analyze, you MUST extract the core chemical molecules discussed in the question. 
       You MUST output their standard SMILES strings inside the \`key_molecules_smiles\` array in the final JSON. 
       If it is a pure calculation with no specific molecules, return an empty array \`[]\`. Do NOT return null or omit the field.

    # 🎨 AI IMAGE GENERATION PROMPT TEMPLATE (For Midjourney v6 / DALL-E 3)
    If the user requests an image generation prompt for a chemical structure, you MUST use the following template EXACTLY. Do not deviate from this structure.

    \`\`\`text
    A highly precise, scientifically rigorous educational infographic of [化學物質英文名稱]. The visual style is modern, minimalist, and resembles a high-end textbook illustration. Background is a clean, dark grey (#1E1E1E) with soft studio lighting. This is a technical diagram; zero artistic hallucination is allowed.

    **Main Visual (Center: 3D Molecular Model):**
    - A high-quality, photorealistic 3D ball-and-stick molecular model of [化學物質英文名稱].
    - Geometry & Rotation: [描述立體特徵，例如：Strict planar aromatic ring with correctly angled side chains]. The molecule must be rotated to clearly show the most complex functional groups without visual overlap (minimize atoms hiding behind other atoms).
    - Explicit Bond Rendering (CRITICAL): Single Bonds are drawn as one distinct solid cylinder. Double Bonds MUST be drawn as EXACTLY TWO clearly separated, parallel cylinders between the two atoms. Triple Bonds MUST be EXACTLY THREE clearly separated, parallel cylinders. Aromatic Rings must clearly show alternating double and single bonds (Kekulé structure) or a perfectly flat ring.
    - Topological Constraints (NO HALLUCINATIONS): No cross-bonding (bonds must only connect adjacent atoms). Do NOT draw long, stretching bonds that cross over the molecule. No floating atoms or disconnected bonds. Carbon must have exactly 4 bond connections (counting double as 2). Oxygen exactly 2. Nitrogen exactly 3 or 4.
    - Atoms must strictly follow IUPAC CPK color coding: Carbon (dark grey), Oxygen (red), Nitrogen (blue), Hydrogen (white).

    **Layout & Annotations (Scientific Diagram Style):**
    - Clear, glowing straight pointer lines (not curved) connecting the 3D model to floating text labels.
    - Label 1: "[標籤文字 1]" pointing exactly to the [部位 1].
    - Label 2: "[標籤文字 2]" pointing exactly to the [部位 2].
    - Typography must be crisp, sans-serif, and precisely spelled.

    **Bottom Left Inset (2D Reference):**
    - A distinct, glowing inset box in the bottom-left corner.
    - Inside the box: A clean, flat, black-and-white 2D skeletal formula (ChemDraw style) of [化學物質英文名稱].
    - Text below the 2D structure: "2D REFERENCE".

    **Style parameters:**
    Scientific data visualization, clinical precision, macro photography, unreal engine 5 render, depth of field, vector art UI elements, educational layout, extremely high resolution, 8k. --ar 16:9 --v 6.0
    \`\`\`

    # 📊 TAIWAN HIGH SCHOOL CHEMISTRY SYLLABUS VISUALIZATIONS (108課綱化學專屬圖表)
    **CRITICAL RULE: DO NOT DRAW RANDOM 3D MOLECULES OR ABSTRACT SPHERES. NO EXCEPTIONS.**
    If the question is a pure mathematical calculation (like limiting reagent or empirical formula) and does not inherently require a conceptual graph, YOU MUST OMIT THE VISUALIZATION ENTIRELY (do not return "visualization_code" or return null).
    
    ONLY generate graphs from the following "Approved 108 Syllabus Categories". You must adapt the data to fit the specific question context:

    **[CATEGORY 1: 物質狀態與氣體定律 (States of Matter & Gas Laws)]** - Use Plotly
    - P-V curve (Boyle's Law), V-T line (Charles' Law), or Vapor Pressure/Solubility vs Temp curves.
    - Example (P-V): \`{ "type": "scatter", "x": [1,2,3,4,5], "y": [120,60,40,30,24], "mode": "lines", "name": "理想氣體" }\`

    **[CATEGORY 2: 熱化學與反應位能圖 (Thermochemistry & Energy Profiles)]** - Use SVG
    - Must show Reactants, Transition State (Ea), Products (ΔH).
    - SVG Example: \`<svg viewBox='-10 -10 120 120' xmlns='http://www.w3.org/2000/svg'><line x1='0' y1='100' x2='100' y2='100' stroke='gray' /><path d='M 10 80 C 40 80, 40 20, 50 20 C 60 20, 60 50, 90 50' fill='none' stroke='#ef4444' stroke-width='3' /><text x='10' y='95' font-size='8'>反應物</text><text x='80' y='65' font-size='8'>生成物</text><line x1='50' y1='20' x2='50' y2='80' stroke='#3b82f6' stroke-dasharray='2,2' /><text x='52' y='50' font-size='8'>Ea</text></svg>\`
    *(Note: Use SINGLE QUOTES inside svgCode!)*

    **[CATEGORY 3: 動力學 - 動能分布圖 (Maxwell-Boltzmann Distribution)]** - Use Plotly
    - Show fraction of molecules vs Kinetic Energy at different temperatures (T1, T2).
    - Example: \`{ "type": "scatter", "mode": "lines", "line": {"shape": "spline"}... }\` (bell-like skewed curves).

    **[CATEGORY 4: 化學平衡與速率 (Equilibrium & Rates)]** - Use Plotly
    - Concentration or Rate vs. Time graph showing equilibrium state.
    - Example: \`{ "type": "scatter", "name": "反應物", "y": [1.0, 0.5, 0.25, 0.15, 0.1, 0.1] }\`

    **[CATEGORY 5: 酸鹼反應滴定曲線 (Acid-Base Titration)]** - Use Plotly
    - S-shaped curve (pH vs Volume of Titrant).
    - Layout must have y-axis from 0 to 14.

    **[CATEGORY 6: 物質構造與週期表趨勢 (Atomic Structure & Periodicity)]** - Use Plotly
    - E.g., Successive Ionization Energies (游離能) or Electronegativity trends. Bar charts or scatter lines.

    **[CATEGORY 7: 相圖 (Phase Diagrams)]** - Use Plotly
    - P vs T diagrams (Solid, Liquid, Gas regions, Triple point).

    **[CATEGORY 8: 3D 分子結構 (3D Molecular Structure)]** - Use mol3d
    - For concepts involving steric hindrance, stereoisomers, conformations, or complex molecules.
    - Example (CID): \`{ "type": "mol3d", "title": "Cyclohexane (Chair)", "cid": "8078" }\`
    - Example (SMILES, when CID unknown): \`{ "type": "mol3d", "title": "Phosphoric acid", "smiles": "OP(=O)(O)O" }\`
    - **Rule**: Prefer \`smiles\` or \`cid\`; if title is Chinese, still output \`smiles\` or \`english_name\` for PubChem.

    IF AND ONLY IF the problem belongs to one of these 8 categories, generate the appropriate Plotly, SVG, or mol3d visualization. OTHERWISE, SKIP THE VISUALIZATION.

    # ALTERNATIVE SOLUTIONS — STRUCTURED ISOLATION (MANDATORY WHEN CORRECT)
    If CORRECT, you MUST still populate **"alternative_solutions"** with **AT LEAST SEVEN (7)** string entries (short labels or one-line summaries per method) for backward compatibility.
    You MUST **also** populate **"alternative_methods"** with **at least seven (7)** objects — **one object per distinct solution path**, strictly isolated:
    - **FORBIDDEN**: Merging two methods into one object, or cramming multiple unrelated derivations into a single \`steps\` string.
    - Each object: \`{ "method_name": "解法一：…", "description": "繁中說明此法為何成立…", "steps": [ "…", "…" ] }\`.
    - **steps array**: **One major step per array element** — one stoichiometry row, one \`$$...$$\` block, one \`\\ce{...}\` line, or one \`<smiles>...</smiles>\` tag per element (not multiple unrelated equations in one string).
    - If JSON length is tight, shorten prose but **never** merge two methods into one object; prefer valid complete JSON over runaway length.

    # CHEMISTRY SOLUTION TYPOGRAPHY (算式／化學式逐行 — CRITICAL)
    In **feedback**, **concept_correction**, **correct_calculation**, and each **alternative_methods[].steps** string:
    - Put **one** major equation, reaction, or \`\\ce{...}\` relation per display line or per \`steps[]\` item; use \`$$ \\begin{aligned} ... \\end{aligned} $$\` with **one relation per row** (end each row with \`\\\\\` per JSON escaping rules) **or** multiple separate \`$$...$$\` blocks separated by newlines.
    - **FORBIDDEN**: Chaining many \`=\` or reaction arrows in a single run-on line; stuffing several \`<smiles>\` tags on one line — use line breaks between blocks.
    - Stoichiometry **ICE / arrow-process** tables remain inside a single \`$$\\begin{array}...\\end{array}$$\` (four rows per your rules); do not interleave unrelated methods inside one table.

    # 🎯 CRITICAL POINT ALLOCATION (配分與評分精準度 - 極度重要)
    1. **Extract Exact Points (精準抓取滿分)**: You MUST carefully read the inputted "Content" (Question OCR). Look for keywords like "占 4 分", "每題 5 分", "(8分)", or "配分: 10". 
    2. **Set max_points**: Set the "max_points" field for EACH sub-question exactly to this extracted number. DO NOT default to 5 unless absolutely no score is mentioned in the entire text.
    3. **Sub-score Distribution (子項分數拆解)**: 
       - The student's achieved score is the sum of: 'setup' + 'process' + 'result' + 'logic'.
       - This sum MUST NOT exceed the "max_points".
       - **Partial credit (部分給分 — 強制)**: If ANY part is correct (e.g. correct reaction setup, valid stoichiometry, correct precipitation or common-ion reasoning, proper units), you MUST assign non-zero score to the matching dimension(s) ('setup', 'process', 'logic', and/or 'result'). Do NOT give all zeros unless the submission shows no valid chemistry reasoning at all.
       - **Final-step errors** (e.g. wrong buffer/titration formula while earlier steps are sound): deduct mainly in 'result' and/or 'logic', not by zeroing the entire question.
       - **Consistency with remarks_zh (強制)**: The top-level "remarks_zh" MUST NOT praise specific correct work (e.g. "能正確處理沉澱反應") while leaving every sub-question's setup/process/result/logic at zero. If you describe a strength in the remarks, reflect it in the numeric sub-scores.
       - Only when the answer is entirely irrelevant or blank should all sub-scores be 0.

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}

    # FIELD DEFINITIONS (CRITICAL)
    Before generating the JSON, you MUST adhere to these exact rules for specific fields:
    - "key_molecules_smiles": MUST contain an array of SMILES strings for key molecules discussed in the question. If none exist, output an empty array [].
    - "max_points": MUST be the exact total points extracted from the question text (e.g., 4, 5, 10). DO NOT default to 5.
    - "setup": Score for chemical setup, reactions, and equations (觀念/列式得分).
    - "process": Score for stoichiometry and mathematical calculation steps (運算過程得分).
    - "result": Score for the final analytical result and sig figs (答案正確性得分).
    - "logic": Additional score for logical deduction (邏輯附加分).

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
          "key_molecules_smiles": ["SMILES字串1", "SMILES字串2"],
          "max_points": 4,
          "setup": 1.0,
          "process": 2.0,
          "result": 1.0,
          "logic": 0,
          "feedback": "Step-by-Step Analysis...",
          "concept_correction": "觀念辯正...",
          "alternative_solutions": ["解法一摘要…", "解法二摘要…", "…共至少七筆字串"],
          "alternative_methods": [
            {
              "method_name": "解法一：電荷守恆法",
              "description": "繁體中文說明此法為何適用…",
              "steps": ["$$\\\\ce{...}$$", "$$\\\\text{…}$$"]
            },
            {
              "method_name": "解法二：物料平衡",
              "description": "…",
              "steps": ["$$\\\\begin{array}{...}...\\\\end{array}$$"]
            }
          ],
          "correct_calculation": "Step 1:\\n$$...$$\\nStep 2:\\n$$...$$",
          "annotations": ["Text"],
          "visualization_code": {
             "explanation": "Chemistry visualization explanation...",
             "visualizations": [
               {
                 "type": "mol3d",
                 "title": "3D 分子結構",
                 "cid": "8078"
               }
             ]
          }
        }
      ]
    }
    `;
  }
}
