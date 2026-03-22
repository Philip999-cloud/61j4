import React from 'react';
import { Target, Cpu, ShieldCheck } from 'lucide-react';

interface AseaWhitepaperProps {
  className?: string;
}

export default function AseaWhitepaper({ className = '' }: AseaWhitepaperProps) {
  return (
    <div className={`space-y-8 text-slate-700 dark:text-gray-300 leading-relaxed ${className}`}>
      {/* 標題區塊 */}
      <div className="border-b border-slate-200 dark:border-gray-700 pb-6 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-snug">
          ASEA：次世代人工智慧<br className="hidden md:block" />高級中學升學測驗評閱系統
        </h1>
        <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
          架構與技術規格白皮書 (AI-Powered Smart Education Assistant: Architectural and Technical Specifications)
        </p>
      </div>

      {/* 壹、 核心定位 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          壹、 核心定位、教育經濟影響與商業策略藍圖
        </h2>
        <div className="pl-8 space-y-4 text-justify">
          <p>
            本系統（ASEA）乃專為針對臺灣高級中等學校三年級應屆考生與重考生所建構之自動化評量輔助平臺。其主要目的旨在解決現行學科能力測驗與分科測驗中，非選擇題（包含語文寫作、數理化學科之進階非選擇題型與混合題型）長期面臨之評閱延遲與高昂人力營運成本等結構性市場痛點。在傳統升學評量體制下，受測者通常需經歷數日至數週之等待期方能取得評閱結果。依據教育心理學之認知學習迴圈（Cognitive Learning Cycle）理論，此種延遲反饋將嚴重阻斷知識之即時內化過程，致使受測者之錯誤概念與解題盲點於等待期中產生固化現象。此外，傳統評閱結果往往僅具備基礎之扣分標示與標準答案之核發，而極度缺乏具備實質引導效益、個體化差異分析之建設性反饋。
          </p>
          <p>
            藉由制定每月新臺幣五百元之常規訂閱費率方案，並輔以七日之無條件無償試用期機制，本系統預期將能以高度之成本效益比，對傳統高價位之個人私人輔導與大型補習教育市場產生降維層級之競爭優勢與範式轉移（Paradigm Shift）。此一破壞性創新之定價策略，其潛在社會經濟影響在於有效消弭因社經地位差異所導致之優質教育資源分配不均，具體落實精英教育平民化之願景。本系統之開發與迭代進程嚴謹遵從「最小可受喜愛產品」（Minimum Lovable Product, MLP）之架構原則，於初期研發階段並非追求功能模組之無限擴張與全面覆蓋，而是將核心研發資源與基礎設施算力集中挹注於試用期初始階段之「關鍵體驗節點」（Critical User Journey Nodes）。
          </p>
          <p>
            舉例言之，當受測者於非常規營運時段（如深夜時分）完成測驗文本並執行上傳指令後，系統後台之非同步處理單元得於三十秒內自動生成近似具備高度專業素養之教育從業人員所提供之兼具關懷性、啟發性與邏輯精確性之詳細評閱建議。依據系統架構之最高設計規範，核心語文學科之評閱適切度與情感共鳴擬真度，以及數理學科之推導邏輯與計算精確度，已被設定為必須達成百分之百達成率之零容忍（Zero-Tolerance）驗收基準。
          </p>
        </div>
      </section>

      {/* 貳、 核心技術架構 */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
          <Cpu className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          貳、 核心技術架構解析與技術瓶頸之突破方案
        </h2>
        <div className="pl-8 space-y-6">
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-200">
              一、 視覺語言模型（VLM）與人機協同驗證機制之整合應用
              <span className="block text-sm text-slate-500 dark:text-gray-400 font-normal mt-1">（針對手寫文本辨識容錯率之優化與降噪）</span>
            </h3>
            <div className="space-y-2 text-justify bg-slate-50 dark:bg-gray-800/50 p-4 rounded-lg border border-slate-100 dark:border-gray-700">
              <p><strong>面臨之技術挑戰與環境變數：</strong>傳統光學字元辨識（OCR）技術於處理規格化之印刷文本時雖具備穩定效能，然於處理受測者在測驗高壓環境及時間壓迫下所產生之潦草字跡時，其精確度呈現斷崖式下降之趨勢。實際測驗載體常伴隨墨色不均、筆畫重疊、修正液不規則塗抹，以及非標準化之書寫行距等多重光學干擾變數。此現象將導致人工智慧之評閱基準建立於語意破碎且充滿謬誤之文本數據之上，進而引發「無用數據輸入，無用數據輸出」（Garbage In, Garbage Out）之連鎖負面效應，致使最終之評量結果完全喪失信度與效度。</p>
              <p><strong>實施之解決方案與底層邏輯：</strong>經專案演算法團隊縝密評估後，傳統僅依賴圖像邊緣特徵與像素對比之 OCR 技術已被全面自系統架構中汰除，取而代之者為全面升級調用當前業界最先進且具備頂尖效能之多模態視覺語言模型（Vision-Language Model）。此等先進技術之導入，使系統跳脫單純之字元映射，轉而具備基於圖像情境、語法結構與上下文邏輯進行全局語意推斷之卓越能力。該模型能跨模態萃取文本特徵，利用貝氏推論（Bayesian Inference）自動修正難以單憑視覺辨識之字跡，還原受測者之真實表達意圖。</p>
              <p><strong>使用者體驗之優化配置與主動式機器學習：</strong>為防範人工智慧模型在推斷過程中可能產生之過度自信偏差（Overconfidence Bias）與潛在之語意扭曲，系統架構中已正式且強制性地導入「人機協同驗證」（Human-in-the-loop）機制。於系統啟動高運算成本之深度評閱與邏輯驗證程序前，前置模組將先提供一低延遲之互動式使用者介面，供受測者針對系統初步辨識之草稿進行快速複核。此介面將針對低置信度（Low Confidence Score）之辨識區塊進行視覺化之高亮標註。此舉不僅被證實能有效節約下游無效之應用程式介面（API）呼叫成本，更被認為能將潛在由系統辨識謬誤所引發之負面反應，轉化為受測者對系統運作之參與感與掌控權。同時，受測者之手動修正行為，將被匿名化擷取並轉化為系統後續進行強化學習（Reinforcement Learning）之高品質標註數據。</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-200">
              二、 降維空間矩陣對齊技術
              <span className="block text-sm text-slate-500 dark:text-gray-400 font-normal mt-1">（針對化學科 ICE 表格及複雜數理排版錯位之解決方案）</span>
            </h3>
            <div className="space-y-2 text-justify bg-slate-50 dark:bg-gray-800/50 p-4 rounded-lg border border-slate-100 dark:border-gray-700">
              <p><strong>面臨之技術挑戰與系統穩定性風險：</strong>化學計量領域中核心之「莫耳數 ICE 表格」（Initial, Change, Equilibrium）、多重電子組態表示法，以及繁複之物理、數學聯立方程式與高階微積分算式，於轉譯為前端公式渲染語法時，極易發生垂直與水平排列錯位或語法衝突之現象。此類非標準化之語法生成將直接導致前端 KaTeX 或 MathJax 渲染引擎之抽象語法樹（Abstract Syntax Tree, AST）解析失敗，進而引發視覺呈現之全面崩潰。此種系統層級之錯誤將直接導致受測者認知負荷（Cognitive Load）劇增，並連帶嚴重折損平台之學術專業度與系統信賴度。</p>
              <p><strong>實施之解決方案與強制規範：</strong></p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>數據輸入與空間拓樸解析層面：</strong>系統已導入專精於二維空間公式辨識與結構拓樸分析之頂尖應用程式介面。該技術被證實能透過神經網絡精準捕獲數學算式中之空間對齊結構與層次邏輯，其中涵蓋上下標之從屬關係、多層次分式之對齊基準線，及高維度矩陣等複雜排版，並將其轉碼為高度結構化之向量表示。</li>
                <li><strong>數據輸出與渲染防禦層面：</strong>於人工智慧之系統提示指令（System Prompt）與輸出約束控制器中，已嚴格實作「純平無換行」（Flat No-Enter）之絕對規範，並輔以動態 <code>{`\\begin{array}`}</code> 欄位矩陣匹配之底層防呆機制。運算模型受到強制性之語法約束，被絕對禁止於數學渲染區塊內部使用任何作業系統標準換行字元（如 <code>{`\\n`}</code> 或 <code>{`\\r\\n`}</code>），而必須全數且無例外地採用純粹之 LaTeX 換列語法（即 <code>{`\\\\`}</code> 雙重跳脫字元）進行單行字串輸出。此一系統層級之強制性規範被充分證實已徹底根絕 KaTeX 渲染崩潰之底層技術瑕疵，以確保最終學術排版之視覺呈現能達到且維持國際學術文獻級別之極端嚴謹度與穩定性。</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 參、 商業防禦壁壘 */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          參、 商業防禦壁壘構建與營運成本之動態控管機制
        </h2>
        <div className="pl-8 space-y-4 text-justify">
          <p className="mb-4">
            針對在低單價訂閱費率（新臺幣五百元/月）之前提下，為維持長期且具備財政可持續性（Financial Sustainability）之正向毛利率（Gross Margin），並有效規避高昂之外部 AI API 呼叫費用所帶來之營運破產風險，系統架構已部署下列三層級之防禦與動態控管機制：
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-200 mb-2">一、 混合式路由架構（Hybrid AI Routing）與科際差異化運算</h3>
              <p className="text-sm text-slate-600 dark:text-gray-400 mb-2">系統架構已徹底摒棄單一超大型語言模型處理全域任務之低效能傳統思維，轉而採用依據學科本質屬性進行智慧化、差異化運算分流之策略：</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>人文學科之感性評閱與語意解析：</strong>針對國文與英文之寫作測驗，其處理封包將被精準路由至專精於自然語言處理、修辭學結構分析且具備高度語意解析能力之先進大型語言模型。此決策乃基於利用該等頂尖模型在語言生成領域之細膩度，以期模擬具備高度教學熱忱之人類導師。系統被要求建構符合教育心理學之正向增強（Positive Reinforcement）反饋迴路，生成具備適度溫度、同理心與建設性之寫作反饋與修辭建議，預期將有效降低受測者面對批評時之心理防衛機制，提升學習動機。</li>
                <li><strong>數理學科之嚴謹演算與邏輯驗證：</strong>針對數學、物理與化學等要求絕對數值與邏輯精確之科目，運算任務將被強制路由至具備頂尖邏輯推理能力、符號運算能力與數理演算準確度之次世代人工智慧模型。為確保輸出結果之絕對可靠性，系統將強制掛載並啟動「思維鏈」（Chain-of-Thought, CoT）之高階提示詞指令。模型被嚴格要求必須於背景程序中依序且完整地完成「物理/數學列式、因次分析（Dimensional Analysis）、數值推導運算、邊界條件檢查、邏輯自洽性驗證」等多重查核步驟後，方能輸出最終之評量分數與訂正反饋。此機制之主要目的在於精準定位受測者於運算過程中之微小邏輯斷點（如正負號轉換錯誤、單位換算遺漏），並被視為完全消除人工智慧幻覺（Hallucination）及避免傳遞錯誤學理之絕對必要查核程序。</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-200 mb-2">二、 多層次快取與階層式效能動態降級機制（Caching & Tiered Degradation）</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>感知數位指紋快取技術（Perceptual Fingerprinting Cache）：</strong>鑑於高級中學升學測驗與模擬考具備極高之題型重複性與生命週期，系統內部已建置具備高吞吐量之題庫特徵比對模組。運用感知雜湊演算法（Perceptual Hashing Algorithm）對受測者上傳之影像與文本特徵進行向量空間映射與相似度比對。當複數受測者上傳源自同一課綱之熱門測驗題型或全國性模擬考題時，倘若系統偵測到高於設定閾值之快取命中（Cache Hit），則將直接自非關聯式資料庫中提取並回傳標準解題邏輯、常犯錯誤統計與預先生成之提示，藉此完全省略啟動高延遲、高成本大型語言模型（LLM）生成運算之耗能程序，極大化伺服器之並行處理能力。</li>
                <li><strong>動態降級調用與資源分配（Dynamic Resource Allocation）：</strong>路由引擎內部實作了基於文本複雜度指標（如詞彙多樣性、算式深度、上下文依賴程度）之動態評估器。針對難易度較低之單一知識點選擇題訂正、基礎觀念名詞解釋，或無複雜邏輯推演之短篇問答任務，路由引擎被賦予自動且無縫降級調用輕量化、具備極高反應速度且營運成本極低之高效能微型運算模型之權限。此一資源分配機制經嚴謹壓力測試評估，可於使用者終端視覺與體感感知無顯著差異之邊界條件下，大幅度削減單次 API 呼叫之經費支出，其成本縮減率最高預估可達百分之八十以上。</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-200 mb-2">三、 長期數據防禦壁壘與演算法自主化（Data Flywheel & Algorithmic Autonomy）</h3>
              <p>
                在當前之全球市場競爭環境中，底層 API 運算存取權限雖易於藉由資本與商業授權取得，然特定區域受測者之真實學習歷程與認知特徵數據，則具備極高度之不可替代性、稀缺性與商業護城河價值。在嚴格遵守資訊安全規範、隱私權相關法規，並落實全面性數據去識別化（De-identification）與加密存儲之前提下，本系統將持續進行臺灣本土受測者之真實手寫特徵、常犯運算錯誤路徑、母語干擾所致之寫作語法偏誤，以及具備高度在地化課綱特徵之迷思概念（Misconceptions）之規模化蒐集與系統化歸檔。
              </p>
              <p className="mt-2">
                預期隨著活躍使用者基數之指數型擴張，該等多維度之結構化與非結構化數據資產將形成顯著之飛輪效應（Flywheel Effect），持續提升平臺預測與介入之精準度。本專案之中長期戰略發展藍圖，計畫將此龐大且具備高語意價值之在地化資料庫，應用於自有專屬領域特定模型（Domain-Specific Small Language Model, SLM）之持續預訓練（Continued Pre-training）與指令微調（Instruction Fine-tuning）工程。其最終極致目標為孕育具備極低延遲、可於邊緣運算（Edge Computing）節點部署，且完全掌握演算法自主權之核心運算引擎，以期構築跨國科技實體與潛在競爭者難以輕易跨越之在地化技術防禦壁壘，並徹底擺脫對於外部高昂通用型 API 供應商之長期依賴。
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <div className="pt-8 text-center text-sm text-slate-400 dark:text-gray-500">
        <p>Copyright © 2026 ASEA Development Team. All rights reserved.</p>
      </div>
    </div>
  );
}
