import React, { useState, useEffect } from 'react';
import { Zap, Camera, FileCheck2, LockOpen, ArrowRight, X } from 'lucide-react';
import AseaWhitepaper from './common/AseaWhitepaper';

export function OnboardingModal() {
  const [show, setShow] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [showLegal, setShowLegal] = useState<'none' | 'terms' | 'privacy'>('none');

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('hasOnboarded');
    if (!hasOnboarded) {
      setShow(true);
    }
  }, []);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleStart = () => {
    if (agreed) {
      localStorage.setItem('hasOnboarded', 'true');
      setShow(false);
    }
  };

  if (!show) return null;

  const slides = [
    {
      id: 0,
      icon: <Zap className="w-20 h-20 text-yellow-500 mb-6" />,
      title: "告別漫長等待，迎來即時進化",
      description: "傳統批改需要數週？ASEA 次世代 AI 引擎只要 30 秒，為您提供頂尖名師級的深度解析與回饋。"
    },
    {
      id: 1,
      icon: (
        <div className="flex items-center justify-center space-x-4 mb-6 text-blue-500">
          <Camera className="w-12 h-12" />
          <ArrowRight className="w-6 h-6 text-gray-400" />
          <FileCheck2 className="w-16 h-16" />
        </div>
      ),
      title: "拍下考卷，三步驟解鎖盲點",
      description: "1. 選擇測驗科目 👉 2. 拍下您的手寫考卷 👉 3. 立即獲取精準的算式驗證與寫作指導。"
    },
    {
      id: 2,
      icon: <LockOpen className="w-20 h-20 text-green-500 mb-6" />,
      title: "準備好開始了嗎？",
      description: "為了讓 AI 清楚讀取考卷，我們在下一步需要存取您的相機權限。請安心，您的考卷僅用於當次批閱，絕不外流。"
    }
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl overflow-hidden relative">
          
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide) => (
              <div key={slide.id} className="w-full flex-shrink-0 flex flex-col items-center justify-center px-4">
                {slide.icon}
                <h2 className="text-2xl font-bold mb-4 dark:text-white text-gray-800">
                  {slide.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed h-20">
                  {slide.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex space-x-2 mb-6">
              {slides.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                    currentSlide === index ? 'bg-blue-600 w-6' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {currentSlide === slides.length - 1 ? (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start gap-3 mb-6 text-left bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 cursor-pointer flex-shrink-0"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    我已閱讀並同意{' '}
                    <span 
                      className="text-blue-500 font-medium hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault(); 
                        setShowLegal('terms');
                      }}
                    >
                      服務條款
                    </span>
                    {' '}與{' '}
                    <span 
                      className="text-blue-500 font-medium hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowLegal('privacy');
                      }}
                    >
                      隱私權政策
                    </span>。
                  </label>
                </div>
                <button 
                  onClick={handleStart}
                  disabled={!agreed}
                  className="w-full bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/30"
                >
                  授權相機並開始使用
                </button>
              </div>
            ) : (
             <button 
                onClick={handleNext}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3.5 rounded-xl transition-all active:scale-95"
              >
                繼續
              </button>
            )}
          </div>
        </div>
      </div>

      {showLegal !== 'none' && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold dark:text-white">
                {showLegal === 'terms' ? '服務條款 (Terms of Service)' : '隱私權政策 (Privacy Policy)'}
              </h3>
              <button 
                onClick={() => setShowLegal('none')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-sm text-gray-600 dark:text-gray-300 space-y-4">
              {showLegal === 'terms' ? (
                <AseaWhitepaper />
              ) : (
                <div className="space-y-6">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-base">
                    我們非常重視您的隱私權。本隱私權政策旨在說明 ASEA 智能評分系統如何蒐集、處理、利用及保護您的個人資料。
                  </p>
                  
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">1. 蒐集之資料類別</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>影像資料：</strong>您主動上傳之考卷、手寫算式與作答內容影像。</li>
                      <li><strong>設備與使用數據：</strong>包含 IP 位址、裝置型號、作業系統版本、系統日誌 (Log) 以及您在平台上的點擊與停留時間，用於優化系統效能。</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">2. 資料之處理與利用目的</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>AI 核心評閱：</strong>您的影像資料將傳送至本系統之 VLM (視覺語言模型) 與 LLM 引擎，僅用於當次之辨識、邏輯推導與評分回饋生成。</li>
                      <li><strong>系統優化與去識別化：</strong>為提升在地化辨識率與評分精準度，系統可能將您的手寫特徵與常犯錯誤進行「不可逆之去識別化 (De-identification)」處理後，納入內部模型之演算法訓練池。您的真實身分將永遠與這些特徵數據脫鉤。</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">3. 資料分享與第三方揭露</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>本系統承諾<strong>【絕對不】</strong>將您的學習數據、個人資料販售或授權給任何第三方廣告商。</li>
                      <li>僅在維持系統核心運作之必要情況下（如：雲端伺服器供應商），我們才會與嚴格遵守保密協定之合作夥伴共享去識別化之基礎數據。</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">4. 資料安全與加密</h4>
                    <p>本平台採用國際標準之 SSL/TLS 加密傳輸協定。所有影像存儲與傳輸過程皆經過高強度加密，防範任何未經授權之存取、竄改或資料外洩。</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">5. 用戶之隱私權利</h4>
                    <p>依據相關個人資料保護法規，您擁有以下權利：</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>請求查詢或閱覽您的個人資料。</li>
                      <li>請求刪除您的帳號及所有關聯之歷史評分紀錄。</li>
                      <li>隨時撤回對我們處理您特定資料的同意。</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">6. 政策更新</h4>
                    <p>本系統保留隨時修改本隱私權政策之權利。重大變更時，我們將於系統內部進行顯著公告。繼續使用本服務即代表您同意最新版本之政策。</p>
                  </div>
                  
                  <br/>
                  <p className="text-center text-gray-400">-- 往下滾動到底部 --</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => setShowLegal('none')}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-3 rounded-xl transition-colors"
              >
                我了解了，關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
