import React, { useState } from 'react';
import { Search, FileText, ChevronRight, MessageCircle } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  views: number;
}

const MOCK_ARTICLES: Record<string, Article[]> = {
  account: [
    { id: '1', title: '如何更改我的密碼？', views: 1240 },
    { id: '2', title: '忘記登入帳號怎麼辦？', views: 850 },
    { id: '3', title: '如何綁定 Google 帳號？', views: 620 },
  ],
  billing: [
    { id: '4', title: '如何取消訂閱？', views: 2100 },
    { id: '5', title: '發票開立與統編設定', views: 1500 },
    { id: '6', title: '退款政策說明', views: 980 },
  ],
  grading: [
    { id: '7', title: '批改結果不準確如何回報？', views: 3400 },
    { id: '8', title: '支援哪些檔案格式？', views: 2800 },
    { id: '9', title: '批改速度變慢了？', views: 1200 },
  ],
  feature: [
    { id: '10', title: '如何建議新功能？', views: 500 },
    { id: '11', title: 'API 整合文件在哪裡？', views: 300 },
  ],
};

const CATEGORIES = [
  { id: 'account', label: '帳號問題' },
  { id: 'billing', label: '付費與訂閱' },
  { id: 'grading', label: '批改異常' },
  { id: 'feature', label: '功能許願' },
];

export const SupportCenterHub: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('grading');
  const [searchQuery, setSearchQuery] = useState('');

  const activeArticles = MOCK_ARTICLES[activeCategory] || [];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header & Search */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">您需要什麼協助？</h2>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋常見問題..."
            className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Article List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">熱門文章</h3>
          <span className="text-xs text-slate-400">根據您的選擇</span>
        </div>
        <div className="divide-y divide-slate-100">
          {activeArticles.map((article) => (
            <button 
              key={article.id}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-indigo-700 transition-colors">
                    {article.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {article.views} 人覺得有幫助
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </button>
          ))}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1">
            查看更多文章 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contact Support CTA */}
      <div className="text-center pt-4">
        <p className="text-slate-500 text-sm mb-3">找不到答案嗎？</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">
          <MessageCircle className="w-4 h-4" />
          請使用右下角的 AI 客服或填寫回報單
        </div>
      </div>
    </div>
  );
};
