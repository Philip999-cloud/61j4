import React, { useState, useEffect } from 'react';

// 定義支援的科目類型
type SubjectType = 'chinese' | 'english' | 'math' | 'physics' | 'chemistry' | 'biology' | 'earth_science' | 'default';

interface GradingLoadingStateProps {
  subject?: SubjectType;
}

// 針對不同科目設計的動態安撫文案
const loadingMessages: Record<SubjectType, string[]> = {
  chinese: [
    "正在解析大考中心寫作標準...",
    "正在比對歷屆佳作句型...",
    "正在評估文意流暢度與修辭...",
    "正在生成國文深度批改建議..."
  ],
  english: [
    "正在分析 CEFR 詞彙等級...",
    "正在檢查文法結構與語意連貫性...",
    "正在比對母語人士寫作習慣...",
    "正在生成英文寫作優化建議..."
  ],
  math: [
    "正在辨識數學運算式與幾何圖形...",
    "正在逐步核對解題邏輯與推導...",
    "正在掃描運算過程中的粗心錯誤...",
    "正在計算最終得分與知識點盲區..."
  ],
  physics: [
    "正在解析物理定律與受力分析...",
    "正在檢查公式推導與單位換算...",
    "正在比對大考中心計分標準...",
    "正在繪製物理概念診斷報告..."
  ],
  chemistry: [
    "正在讀取化學反應方程式...",
    "正在分析微觀結構與化學鍵...",
    "正在核對實驗步驟與數據推論...",
    "正在生成化學素養深度解析..."
  ],
  biology: [
    "正在辨識生物圖譜與專有名詞...",
    "正在分析實驗數據與遺傳推論...",
    "正在比對大考中心評分關鍵字...",
    "正在生成生命科學綜合評量..."
  ],
  earth_science: [
    "正在解析地質、氣象與海象圖表...",
    "正在核對天文現象與空間邏輯...",
    "正在比對跨領域素養考點...",
    "正在生成地科專屬診斷報告..."
  ],
  default: [
    "正在讀取試卷內容...",
    "AI 引擎正在高速運算中...",
    "正在比對歷屆大考題庫...",
    "正在為您生成專屬診斷報告..."
  ]
};

const GradingLoadingState: React.FC<GradingLoadingStateProps> = ({ subject = 'default' }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = loadingMessages[subject] || loadingMessages['default'];

  // 每 3 秒切換一次文案
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
      
      {/* 動態雷達/掃描器動畫 (視覺焦點) */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        {/* 內部的脈衝圓點 */}
        <div className="absolute inset-4 rounded-full bg-blue-500 animate-pulse"></div>
      </div>

      {/* 動態文字切換 */}
      <div className="h-8 flex items-center justify-center overflow-hidden mb-8">
        <p 
          key={messageIndex} 
          className="text-lg font-medium text-gray-700 animate-[fadeInUp_0.5s_ease-out]"
        >
          {messages[messageIndex]}
        </p>
      </div>

      {/* Skeleton 骨架屏 (模擬試卷與批改結果正在生成的樣子) */}
      <div className="w-full space-y-4">
        {/* 模擬標題 */}
        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
        
        {/* 模擬段落 */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full delay-75"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6 delay-100"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6 delay-150"></div>
        </div>

        {/* 模擬分數/雷達圖區塊 */}
        <div className="flex gap-4 pt-4">
          <div className="h-20 w-20 bg-gray-200 rounded-full animate-pulse delay-200"></div>
          <div className="flex-1 space-y-2 py-2">
             <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 delay-300"></div>
             <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3 delay-500"></div>
          </div>
        </div>
      </div>

      {/* 如果您想增加自訂動畫，可以在 tailwind.config.js 擴充 fadeInUp，或者單純依賴 pulse 也可以 */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default GradingLoadingState;
