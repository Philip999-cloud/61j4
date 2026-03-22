import React, { useState, useEffect } from 'react';
import { User, Bell, CreditCard, HelpCircle, Search, ChevronDown, ChevronUp, MessageCircle, Trash2, Star } from 'lucide-react';
import { paymentService, ProductDetails } from '../../services/paymentService';
import { useAppContext } from '../../contexts/AppContext';
import { paymentService, ProductDetails } from '../../services/paymentService';
import { useAppContext } from '../../contexts/AppContext';

// --- 1. ProfileProgressWidget ---
export const ProfileProgressWidget: React.FC = () => {
  const [score] = useState(80);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <User size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">個人檔案</h3>
            <p className="text-slate-500 text-sm">資料完整度</p>
          </div>
        </div>
        <span className="text-2xl font-black text-indigo-600">{score}%</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
        <div 
          className="bg-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-start gap-3">
        <div className="mt-1 text-indigo-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="font-bold text-indigo-900 text-sm">差一點就完美了！</h4>
          <p className="text-indigo-700 text-xs mt-1 leading-relaxed">
            完成您的性別與年齡設定，解鎖更精準的 AI 批改體驗。
          </p>
          <button className="mt-3 text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            立即完成設定
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 2. NotificationSettingsGroup ---
export const NotificationSettingsGroup: React.FC = () => {
  const [settings, setSettings] = useState({
    system: true,
    marketing: false,
    dnd: false
  });

  const handleToggle = (key: keyof typeof settings) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearCache = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    alert('快取已清除！釋放了 142 MB 空間。');
  };

  const Toggle = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
            <Bell size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">通知設定</h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-700">系統重大更新</h4>
              <p className="text-slate-400 text-xs">包含新功能發布與維護公告</p>
            </div>
            <Toggle checked={settings.system} onClick={() => handleToggle('system')} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-700">行銷與優惠</h4>
              <p className="text-slate-400 text-xs">不定期發送專屬折扣碼</p>
            </div>
            <Toggle checked={settings.marketing} onClick={() => handleToggle('marketing')} />
          </div>

          <div className="pt-4 border-t border-slate-100">
             <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                  夜間勿擾模式
                  <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full">Night</span>
                </h4>
                <p className="text-slate-400 text-xs">22:00 - 07:00 暫停所有推播</p>
              </div>
              <Toggle checked={settings.dnd} onClick={() => handleToggle('dnd')} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700">
        <h3 className="font-bold text-slate-800 text-lg mb-4">儲存空間</h3>
        <button 
          onClick={clearCache}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 text-slate-500 dark:text-gray-400 rounded-lg shadow-sm group-hover:text-red-500 transition-colors">
              <Trash2 size={20} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-slate-700">清除 App 快取</h4>
              <p className="text-slate-400 text-xs">可釋放約 142 MB</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">清理</span>
        </button>
      </div>
    </div>
  );
};

// --- 3. SmartPaywallMockup (加強防護版) ---
export const SmartPaywallMockup: React.FC = () => {
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('half_year');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateProfileContext } = useAppContext();

  useEffect(() => {
    paymentService.fetchProducts()
      .then((data) => {
        // 🛡️ 新增的安全防護網：確保是陣列，並過濾掉 undefined 的髒資料
        if (Array.isArray(data)) {
          const safeData = data.filter(item => item && item.tier);
          setProducts(safeData);
        } else {
          setProducts([]);
        }
      })
      .catch((err) => {
        console.error("Fetch products error:", err);
        setError('無法載入方案，請稍後再試。');
      });
  }, []);

  const handleSubscribe = async () => {
    const product = products.find(p => p.tier === selectedTier);
    if (!product) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      const success = await paymentService.purchasePackage(product.id);
      if (success) {
        if (updateProfileContext) {
          updateProfileContext({ 
            isPro: true, 
            trialStartDate: null,
            dailyQuota: 9999
          });
        }
        alert('升級成功！您現在可以享受 Pro 方案的所有功能。');
      } else {
        setError('付款處理失敗，請稍後再試。');
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      setError('付款處理發生錯誤，請稍後再試。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <CreditCard size={28} className="text-indigo-300" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight">升級 Pro 方案</h3>
            <p className="text-slate-400 text-sm">解鎖無限次 AI 批改與進階分析</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {products.length === 0 && !error ? (
            <div className="col-span-1 md:col-span-3 flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            products.map((product) => (
              <button 
                key={product.tier}
                onClick={() => setSelectedTier(product.tier)}
                className={`relative p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-full ${
                  selectedTier === product.tier 
                    ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                }`}
              >
                {product.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-400 to-rose-400 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap flex items-center">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    最受歡迎
                  </div>
                )}
                <div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    {product.title}
                  </div>
                  <div className="text-2xl font-black text-white">
                    ${product.priceTwd}
                    <span className="text-xs font-medium text-slate-500 ml-1">
                      {product.tier === 'monthly' ? '/月' : product.tier === 'half_year' ? '/半年' : '/年'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-indigo-300 font-medium">
                  換算每月約 ${product.monthlyEquivalent}
                </div>
              </button>
            ))
          )}
        </div>

        <button 
          onClick={handleSubscribe}
          disabled={isProcessing || products.length === 0}
          className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-lg hover:bg-slate-100 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            '立即升級'
          )}
        </button>
        <p className="text-center text-slate-500 text-xs mt-4">7 天免費試用，隨時可取消</p>
      </div>
    </div>
  );
};

// --- 4. DynamicFAQView ---
export const DynamicFAQView: React.FC = () => {
  const [openId, setOpenId] = useState<number | null>(0);
  const [search, setSearch] = useState('');

  const faqs = [
    { id: 0, q: "如何匯出批改報告？", a: "您可以在批改結果頁面的右上角找到「匯出 PDF」按鈕，點擊後即可下載完整的分析報告。" },
    { id: 1, q: "AI 評分標準是什麼？", a: "我們採用多模型共識機制，綜合 Google Gemini Pro 與 Flash 的分析結果，針對文法、詞彙、流暢度進行加權評分。" },
    { id: 2, q: "如何取消訂閱？", a: "請前往「訂閱方案」頁籤，點擊最下方的「管理訂閱」即可進行變更或取消。" },
  ];

  const filteredFaqs = faqs.filter(f => f.q.includes(search) || f.a.includes(search));

  return (
    <div className="h-full flex flex-col">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="搜尋常見問題..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {filteredFaqs.map((faq) => (
          <div key={faq.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <button 
              onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-slate-50 transition-colors text-left"
            >
              <span className="font-bold text-slate-700">{faq.q}</span>
              {openId === faq.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            {openId === faq.id && (
              <div className="p-4 bg-slate-50 text-slate-600 text-sm leading-relaxed border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors">
          <MessageCircle size={20} />
          聯絡真人客服
        </button>
      </div>
    </div>
  );
};