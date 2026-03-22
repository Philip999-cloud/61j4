export const subjectOnboardingData: Record<string, { title: string, content: string }> = {
  chinese: {
    title: "📸 寫作批改拍攝指南",
    content: "請將考卷平放避免陰影。若有塗改請用修正帶，並確保整篇文章都在畫面內，字跡越清晰，AI 批改越精準喔！"
  },
  math: {
    title: "🔢 數理推導拍攝指南",
    content: "請盡量保持「等號對齊」與「分數橫線平直」。圖形與算式請保持距離，AI 才能完美驗證您的推導邏輯。"
  },
  chemistry: {
    title: "⚗️ 化學反應式拍攝指南",
    content: "若有計算化學平衡 (ICE 表格)，請務必將數值嚴格對齊。元素符號的大小寫與右上角的電荷也請明確標示！"
  },
  physics: {
    title: "⚙️ 物理力學與電磁學指南",
    content: "若題目包含自由體圖，請將受力箭頭與角度標示清楚。在最終答案處，請將數值與「物理單位」保持一個半形的距離。"
  },
  biology: {
    title: "🧬 圖表與觀念題拍攝指南",
    content: "若是針對課本圖表發問，請確認圖表上的代號清晰可見。申論題請善用箭頭表達因果關係，AI 會依據您的邏輯路徑給予建議。"
  },
  default: {
    title: "📸 拍攝指南",
    content: "請將考卷平放於桌面，避免手機陰影遮擋文字。確保畫面清晰，AI 批改會更精準喔！"
  }
};
