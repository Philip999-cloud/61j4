import { DriveStep } from 'driver.js';

// 定義所有科目的教學劇本
export const ONBOARDING_SCRIPTS: Record<string, { beforeUpload: DriveStep[], afterUpload: DriveStep[] }> = {
  
  // 【語文科：國寫 / 英文】
  chinese: {
    beforeUpload: [
      { element: '#upload-zone', popover: { title: '📸 第一步：拍攝稿紙', description: '請確保光線明亮，並將整篇作文拍在同一個畫面中。若有兩頁請分次上傳。' } },
      { element: '#subject-tips', popover: { title: '💡 國寫小叮嚀', description: 'AI 會針對您的「立意取材」與「結構組織」進行深度分析喔！' } }
    ],
    afterUpload: [
      { element: '#preview-image', popover: { title: '✅ 影像確認', description: '確認字跡清晰後，就可以送出分析了！如果發現模糊，您可以點擊右上角重新拍攝。' } },
      { element: '#start-grading-btn', popover: { title: '🚀 啟動 AI 引擎', description: '點擊這裡，系統將花費約 30 秒為您產出名師級的詳解報告。' } }
    ]
  },

  // 【數理科：數學 / 物理】
  math: {
    beforeUpload: [
      { element: '#upload-zone', popover: { title: '📐 數學科拍攝', description: '請將「計算過程」與「最終答案」一起拍入畫面。' } },
      { element: '#math-format-tip', popover: { title: '⚠️ 算式對齊', description: '若有多行聯立方程式，盡量保持算式整齊，能大幅提升 AI 邏輯驗證的準確度。' } }
    ],
    afterUpload: [
      { element: '#crop-tool', popover: { title: '✂️ 裁切題目', description: '數學科特別需要精準！請使用裁切工具，只框選「單一題目的算式」，避免 AI 混淆。' } },
      { element: '#start-grading-btn', popover: { title: '🔍 驗證邏輯', description: '點擊送出，AI 將一步步檢查您的推導邏輯是否出現正負號或觀念錯誤。' } }
    ]
  },

  // 【化學科】 (針對白皮書提到的 ICE 表格痛點)
  chemistry: {
    beforeUpload: [
      { element: '#upload-zone', popover: { title: '🧪 化學科拍攝', description: '上傳您的化學計算或反應式。' } },
      { element: '#chem-ice-tip', popover: { title: '📊 ICE 表格辨識', description: '若有繪製「莫耳數 ICE 表格」，請確保表格的初始、變化、平衡三行清晰可見。' } }
    ],
    afterUpload: [
      { element: '#start-grading-btn', popover: { title: '⚛️ 解析反應式', description: '送出後，系統將自動渲染高階化學式並檢查您的化學計量。' } }
    ]
  }
};
