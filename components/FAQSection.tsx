import React, { useState } from 'react';

// 定義常見問題的資料結構
const FAQ_DATA = [
  {
    question: '支援哪些科目與題型？',
    answer: '目前系統支援數學、物理、化學、生物、英文及國文等主要學科。題型方面，支援選擇題、填充題以及計算/非選題的綜合評估。'
  },
  {
    question: '照片上傳有格式或大小限制嗎？',
    answer: '有的，為了確保 AI 辨識的準確度，請上傳清晰的 JPG、PNG 或 PDF 檔案。單一檔案大小請盡量控制在 10MB 以內。'
  },
  {
    question: 'AI 批改的準確度如何？',
    answer: '我們的 AI 模型針對教育領域進行了深度優化，準確度極高。但 AI 偶爾仍可能產生誤判，建議您將批改結果作為輔助參考。'
  },
  {
    question: '如果對批改結果有疑慮怎麼辦？',
    answer: '您可以點擊該題旁邊的「重新生成」或「報錯」按鈕，系統會嘗試重新分析；您也可以手動修改最終得分。'
  },
  {
    question: '如何更改或取消我的訂閱方案？',
    answer: '請前往「設定」>「帳戶與訂閱」，您可以隨時在該頁面管理您的訂閱方案。若取消訂閱，您的進階權益將保留至當期計費週期結束。'
  },
  {
    question: '我的上傳資料與隱私安全嗎？',
    answer: '我們非常重視您的隱私。您上傳的考卷與照片僅用於當次批改分析，系統不會將其用於公開模型訓練，且資料傳輸過程皆經過加密保護。'
  }
];

export const FAQSection: React.FC = () => {
  // 記錄目前展開的問題 Index
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm transition-colors">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
        常見問題 (FAQ)
      </h2>
      
      <div className="space-y-4">
        {FAQ_DATA.map((faq, index) => (
          <div 
            key={index} 
            className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden transition-all duration-200"
          >
            {/* 問題按鈕 (點擊展開/收合) */}
            <button
              className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-left focus:outline-none transition-colors"
              onClick={() => toggleQuestion(index)}
              aria-expanded={activeIndex === index}
            >
              <span className="font-medium text-gray-700 dark:text-gray-200">{faq.question}</span>
              <span className="text-gray-400 text-xl font-light">
                {activeIndex === index ? '−' : '+'}
              </span>
            </button>
            
            {/* 答案區塊 (根據 activeIndex 決定是否顯示) */}
            {activeIndex === index && (
              <div className="p-4 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-gray-100 dark:border-zinc-700">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部客服引導 */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        找不到您要的答案嗎？ <br className="sm:hidden" />
        <a href="mailto:support@yourdomain.com" className="text-blue-600 dark:text-blue-400 hover:underline font-medium ml-1">
          聯繫客服團隊
        </a>
      </div>
    </div>
  );
};
