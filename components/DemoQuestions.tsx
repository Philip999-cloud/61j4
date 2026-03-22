import React from 'react';
import { Beaker, Dna, Sparkles } from 'lucide-react';

interface DemoQuestionsProps {
  onSelectDemo: (demoData: any) => void;
}

// 寫死的完美範例資料結構
const DEMO_DATA = {
  chemistry: {
    subject: 'chemistry',
    title: '化學：酸鹼中和滴定曲線分析',
    content: `
### 題目描述
在 $25^\\circ\\mathrm{C}$ 下，以 $0.100\\,\\mathrm{M}$ 的 $\\mathrm{NaOH}$ 水溶液滴定 $50.0\\,\\mathrm{mL}$ 未知濃度的 $\\mathrm{CH_3COOH}$（醋酸，$\\mathrm{K_a} = 1.8 \\times 10^{-5}$）水溶液。當滴入 $25.0\\,\\mathrm{mL}$ 的 $\\mathrm{NaOH}$ 時，溶液的 $\\mathrm{pH}$ 值為 $4.74$。請計算此醋酸水溶液的初始濃度。

### 完美解題步驟
1. **分析滴定半當量點**
   當滴入 $25.0\\,\\mathrm{mL}$ 的 $\\mathrm{NaOH}$ 時，$\\mathrm{pH} = 4.74$。
   已知醋酸的 $\\mathrm{pK_a} = -\\log(1.8 \\times 10^{-5}) \\approx 4.74$。
   根據 Henderson-Hasselbalch 方程式：
   $$
   \\mathrm{pH} = \\mathrm{pK_a} + \\log\\left(\\frac{[\\mathrm{CH_3COO^-}]}{[\\mathrm{CH_3COOH}]}\\right)
   $$
   因為 $\\mathrm{pH} = \\mathrm{pK_a}$，所以 $\\log\\left(\\frac{[\\mathrm{CH_3COO^-}]}{[\\mathrm{CH_3COOH}]}\\right) = 0$，即 $[\\mathrm{CH_3COO^-}] = [\\mathrm{CH_3COOH}]$。
   這代表此時為**半當量點**。

2. **計算當量點體積**
   既然 $25.0\\,\\mathrm{mL}$ 是半當量點，那麼達到完全中和（當量點）所需的 $\\mathrm{NaOH}$ 體積為：
   $$
   V_{\\mathrm{eq}} = 25.0\\,\\mathrm{mL} \\times 2 = 50.0\\,\\mathrm{mL}
   $$

3. **計算初始濃度**
   在當量點時，酸的當量數等於鹼的當量數：
   $$
   C_a \\times V_a = C_b \\times V_b
   $$
   代入已知數據：
   $$
   C_a \\times 50.0\\,\\mathrm{mL} = 0.100\\,\\mathrm{M} \\times 50.0\\,\\mathrm{mL}
   $$
   $$
   C_a = 0.100\\,\\mathrm{M}
   $$

**結論：** 該醋酸水溶液的初始濃度為 $0.100\\,\\mathrm{M}$。
    `
  },
  biology: {
    subject: 'biology',
    title: '生物：孟德爾遺傳法則與機率計算',
    content: `
### 題目描述
豌豆的紫花（$P$）對白花（$p$）為顯性，高莖（$T$）對矮莖（$t$）為顯性。今有一株基因型為 $PpTt$ 的紫花高莖豌豆進行自交（self-fertilization）。假設這兩對基因符合獨立分配法則，請問子代中表現型為「紫花矮莖」的機率為何？

### 完美解題步驟
1. **確立親代基因型與配子**
   親代基因型為 $PpTt$。
   根據獨立分配法則，親代可產生四種配子，比例相同：
   $PT$、$Pt$、$pT$、$pt$（各佔 $\\frac{1}{4}$）。

2. **分析單一性狀的遺傳機率**
   將兩對基因分開計算（棋盤法 / 旁氏表 Punnett square）：
   - **花色（$Pp \\times Pp$）**：
     產生紫花（$P\\_$）的機率為 $\\frac{3}{4}$。
     產生白花（$pp$）的機率為 $\\frac{1}{4}$。
   - **莖高（$Tt \\times Tt$）**：
     產生高莖（$T\\_$）的機率為 $\\frac{3}{4}$。
     產生矮莖（$tt$）的機率為 $\\frac{1}{4}$。

3. **計算目標表現型的聯合機率**
   題目要求的是「紫花矮莖」的表現型。
   - 紫花機率 = $\\frac{3}{4}$
   - 矮莖機率 = $\\frac{1}{4}$
   
   根據乘法法則（兩獨立事件同時發生的機率）：
   $$
   P(\\text{紫花矮莖}) = P(\\text{紫花}) \\times P(\\text{矮莖}) = \\frac{3}{4} \\times \\frac{1}{4} = \\frac{3}{16}
   $$

**結論：** 子代中表現型為「紫花矮莖」的機率為 $\\frac{3}{16}$。
    `
  }
};

export const DemoQuestions: React.FC<DemoQuestionsProps> = ({ onSelectDemo }) => {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8 mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          不知道要測什麼？試試完美範例
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 化學範例按鈕 */}
        <button
          onClick={() => onSelectDemo(DEMO_DATA.chemistry)}
          className="group relative flex flex-col items-start p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-bl-full -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Beaker className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-800">化學科</span>
          </div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            酸鹼中和滴定曲線分析
          </p>
          <p className="text-xs text-slate-400 mt-2">
            包含化學式、pH值計算與精準排版
          </p>
        </button>

        {/* 生物範例按鈕 */}
        <button
          onClick={() => onSelectDemo(DEMO_DATA.biology)}
          className="group relative flex flex-col items-start p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-bl-full -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Dna className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-800">生物科</span>
          </div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            孟德爾遺傳法則與機率計算
          </p>
          <p className="text-xs text-slate-400 mt-2">
            包含基因型、獨立分配法則與數學機率
          </p>
        </button>
      </div>
    </div>
  );
};

export default DemoQuestions;
