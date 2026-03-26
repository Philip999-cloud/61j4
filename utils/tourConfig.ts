import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// 共用的按鈕與模型設定教學
const commonTailSteps = [
  { 
    element: '#tour-model-selector', 
    popover: { title: '⚙️ 選擇 AI 模型', description: '最後，您可以選擇要使用「標準速度」還是「深度思考 (思維鏈)」的模型來進行批閱。' } 
  },
  { 
    element: '#tour-action-btn', 
    popover: { title: '🚀 開始預覽辨識', description: '都準備好了嗎？點擊這裡，AI 會先將您的圖片轉為文字讓您確認，確認無誤後就會開始批閱！' } 
  }
];

/** driver.js 執行時支援 closeBtnText，型別定義可能落後 */
const commonOpts = {
  showProgress: true,
  animate: true,
  doneBtnText: '完成',
  closeBtnText: '跳過',
  nextBtnText: '下一步',
  prevBtnText: '上一步',
} as Parameters<typeof driver>[0];

export const startSubjectTour = (subjectId: string) => {
  const isChinese = subjectId.includes('chinese');
  const isChemistry = subjectId.includes('chemistry');
  const isMath = subjectId.includes('math');

  // 設定導覽引擎
  const driverObj = driver({
    showProgress: true,
    animate: true,
    progressText: '第 {{current}} 步，共 {{total}} 步',
    doneBtnText: '完成',
    closeBtnText: '跳過',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
  } as Parameters<typeof driver>[0]);

  let steps: any[] = [];

  if (isChinese) {
    // 語文寫作科專屬導覽
    steps = [
      { element: '#tour-q-s1q1', popover: { title: '📄 題目圖片 (選填)', description: '如果您有特定的題目要求，可以拍下題目上傳，AI 會依據題目給予更精準的講評。' } },
      { element: '#tour-r-s1q1', popover: { title: '📖 參考範文 (選填)', description: '如果有大考中心的佳作或官方範文，上傳後 AI 會對比您的文章與範文的差距。' } },
      { element: '#tour-s-s1q1', popover: { title: '✍️ 學生作答 (必填)', description: '重點來了！請將您的「知性題」作文拍下。記得光線明亮、整頁入鏡喔。' } },
      ...commonTailSteps
    ];
  } else if (isChemistry) {
    // 化學科專屬導覽
    steps = [
      { element: '#tour-standard-q', popover: { title: '📄 題目圖片 (選填)', description: '請拍下化學題目。若包含複雜的化學結構式，請確保清晰。' } },
      { element: '#tour-standard-r', popover: { title: '📖 標準詳解 (選填)', description: '上傳解答，AI 可以幫您找出您與標準答案的思考盲點。' } },
      { element: '#tour-standard-s', popover: { title: '✍️ 學生作答 (必填)', description: '請拍下您的計算過程。注意：若有「ICE 表格（初反平）」，請務必將數值對齊！' } },
      { element: '#tour-chem-editor-btn', popover: { title: '🧪 化學繪圖板', description: '如果是文字輸入模式，您還能點擊這裡，直接畫出有機分子的結構！' } },
      ...commonTailSteps
    ];
  } else {
    // 預設理科/數學導覽
    steps = [
      { element: '#tour-standard-q', popover: { title: '📄 題目圖片 (選填)', description: '上傳題目，讓 AI 知道您正在解哪一題。' } },
      { element: '#tour-standard-r', popover: { title: '📖 標準詳解 (選填)', description: '提供詳解，AI 能更精確為您進行步驟除錯。' } },
      { element: '#tour-standard-s', popover: { title: '✍️ 學生作答 (必填)', description: '請拍下計算過程。若有多行算式或矩陣，請盡量保持等號對齊，方便 AI 驗證邏輯。' } },
      ...commonTailSteps
    ];
  }

  driverObj.setSteps(steps);
  driverObj.drive();
};

export const startProfileTour = () => {
  driver({ ...commonOpts, steps: [
    { element: '#tour-tab-profile', popover: { title: '👤 個人檔案', description: '這裡是您的預設主頁。' } },
    { element: '#tour-profile-avatar', popover: { title: '📸 個人頭像', description: '點擊上傳大頭貼。' } },
    { element: '#tour-profile-edit', popover: { title: '✏️ 編輯資料', description: '隨時更新您的顯示名稱與信箱。' } },
    { element: '#tour-profile-handle', popover: { title: '🆔 專屬 ID', description: '這是您的唯一識別碼。' } },
    { element: '#tour-profile-bio', popover: { title: '📝 個人簡介', description: '寫下您的學習目標吧！' } },
    { element: '#tour-profile-advanced', popover: { title: '🔒 進階資料', description: '設定性別與生日等隱私資訊。' } }
  ]} as Parameters<typeof driver>[0]).drive();
};

export const startActivityTour = () => {
  driver({ ...commonOpts, steps: [
    { element: '#tour-activity-stats', popover: { title: '🏆 學習成就', description: '追蹤您的等級與連續登入天數。' } },
    { element: '#tour-activity-history', popover: { title: '📚 收藏與歷史', description: '隨時回顧過去的完美批改紀錄。' } },
    { element: '#tour-activity-progress', popover: { title: '📈 訂單與進度', description: '查看您的學習歷程與購買的方案收據。' } },
    { element: '#tour-activity-wallet', popover: { title: '💳 錢包管理', description: '綁定信用卡，享受無縫升級體驗。' } },
    { element: '#tour-activity-sub', popover: { title: '🚀 升級 PRO', description: '點擊這裡解鎖無限次極速 AI 批改！' } },
    { element: '#tour-activity-ref', popover: { title: '🎁 邀請獎勵', description: '分享推薦碼給同學，雙方都能獲得點數！' } }
  ]} as Parameters<typeof driver>[0]).drive();
};

export const startSettingsTour = () => {
  driver({ ...commonOpts, steps: [
    { element: '#tour-set-darkmode', popover: { title: '🌙 深色模式', description: '保護眼睛，挑選您喜歡的介面主題。' } },
    { element: '#tour-set-privacy', popover: { title: '👁️ 隱私模式', description: '在公共場合可隱藏您的敏感成績與數據。' } },
    { element: '#tour-set-binding', popover: { title: '🔗 帳號綁定', description: '綁定 Google 或 Apple，確保資料永不遺失。' } },
    { element: '#tour-set-danger', popover: { title: '⚠️ 危險區域', description: '登出或永久註銷帳號的地方。' } }
  ]} as Parameters<typeof driver>[0]).drive();
};

export const startSupportTour = () => {
  driver({ ...commonOpts, steps: [
    { element: '#tour-sup-ai', popover: { title: '🤖 智慧客服', description: '24 小時在線，為您解答任何系統疑問。' } },
    { element: '#tour-sup-issue', popover: { title: '🐛 問題回報', description: 'AI 批改不準確？隨時填單回報給我們。' } },
    { element: '#tour-sup-human', popover: { title: '🧑💻 真人專員', description: '需要進階協助？點擊轉接真人服務。' } },
    { element: '#tour-sup-faq', popover: { title: '❓ 常見問題', description: '了解 VLM 與 CoT 技術是如何幫您批改的。' } }
  ]} as Parameters<typeof driver>[0]).drive();
};
