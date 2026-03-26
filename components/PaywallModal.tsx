import React, { useState, useEffect } from 'react';
import { X, Check, Star } from 'lucide-react';
import { paymentService, ProductDetails } from '@/services/paymentService';
import { useAppContext } from '@/contexts/AppContext';

export function PaywallModal() {
  const { showPaywall, setShowPaywall, upgradeToPro, user } = useAppContext();
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('half_year');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showPaywall) {
      setError(null);
      paymentService.fetchProducts()
        .then(setProducts)
        .catch(() => setError('無法載入方案，請稍後再試。'));
    }
  }, [showPaywall]);

  if (!showPaywall) return null;

  const handleSubscribe = async () => {
    const product = products.find(p => p.tier === selectedTier);
    if (!product) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      const success = await paymentService.purchasePackage(product.id, user?.uid ?? '');
      if (success) {
        upgradeToPro();
        setShowPaywall(false);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10">
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col md:flex-row h-full">
          {/* 左側：價值主張 */}
          <div className="p-8 md:w-1/2 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-900 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">解鎖無限 AI 專屬家教</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">每天 5 次配額不夠用嗎？升級 Pro 方案，讓大考衝刺沒有阻礙。</p>
            <ul className="space-y-4">
              {[
                '無限制的精準解題與步驟批改',
                '解鎖 3D 理科模型與深度圖表渲染',
                '無限次 AI Tutor 追問與觀念釐清',
                '優先客服支援與新功能搶先體驗'
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center text-gray-700 dark:text-gray-200">
                  <div className="mr-3 p-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* 右側：方案選擇 */}
          <div className="p-8 md:w-1/2 flex flex-col justify-center">
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold mb-2">
                享 7 天免費試用，隨時可取消
              </span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-8">
              {products.length === 0 && !error ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                products.map((product) => (
                  <div 
                    key={product.tier}
                    onClick={() => setSelectedTier(product.tier)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedTier === product.tier 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    {product.isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-400 to-rose-400 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-sm whitespace-nowrap">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        最受歡迎 (最適合學期制)
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`font-bold ${selectedTier === product.tier ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                          {product.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">換算每月約 NT$ {product.monthlyEquivalent}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-gray-900 dark:text-white">NT$ {product.priceTwd}</div>
                        <div className="text-xs text-gray-500">
                          {product.tier === 'monthly' ? '/ 月' : product.tier === 'half_year' ? '/ 6個月' : '/ 12個月'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={handleSubscribe}
              disabled={isProcessing || products.length === 0}
              className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '開始 7 天免費試用'
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              試用期滿後將自動以您選擇的方案扣款。您可以在試用期結束前隨時於設定中取消，不會收取任何費用。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}