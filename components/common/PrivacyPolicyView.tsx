import React from 'react';

export default function PrivacyPolicyView() {
  return (
    <div className="prose dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">ASEA 隱私權政策</h1>
        <p className="text-slate-500 dark:text-gray-400 font-medium">最後更新日期：2026年3月</p>
      </div>

      <p className="text-slate-700 dark:text-slate-300">
        歡迎您使用 ASEA（以下簡稱「本應用程式」、「我們」或「本團隊」）。我們深知個人隱私對您的重要性，並承諾致力於保護您的個人資料安全。本《隱私權政策》旨在向您詳細說明我們如何收集、使用、儲存、分享及保護您的個人資訊，以及您所擁有的相關權利。
      </p>
      <p className="text-slate-700 dark:text-slate-300">
        請您在存取或使用本應用程式前，務必仔細閱讀並透徹理解本政策。當您註冊帳號或開始使用本應用程式，即表示您已同意我們按照本政策的規定處理您的資訊。
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">一、 我們收集的資訊與權限要求</h2>
        <p className="text-slate-700 dark:text-slate-300">為向您提供「次世代人工智慧高級中學升學測驗評閱系統」之核心服務，我們將在您使用特定功能時，收集或要求以下資訊與設備權限：</p>
        
        <div className="space-y-2 text-slate-600 dark:text-slate-300">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">帳號註冊與登入資訊：</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>當您建立 ASEA 帳號時，我們會收集您的電子郵件地址與密碼。</li>
            <li>若您選擇使用第三方帳號（如 Google 或 Apple ID）登入，我們將從該授權方獲取您的公開個人資料（如姓名與電子郵件）。</li>
          </ul>
        </div>

        <div className="space-y-2 text-slate-600 dark:text-slate-300 mt-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">裝置權限 (Device Permissions)：</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>相機權限 (Camera)：</strong>僅用於拍攝實體手寫考卷、題目或筆記，以便進行即時 AI 辨識。</li>
            <li><strong>相簿/儲存空間權限 (Photo Library/Storage)：</strong>僅用於讓您從裝置中挑選並上傳既有的考卷圖像檔案。</li>
          </ul>
        </div>

        <div className="space-y-2 text-slate-600 dark:text-slate-300 mt-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">使用者生成內容與學習歷程 (User-Generated Content & Analytics)：</h3>
          <p className="pl-5">您上傳的測驗圖像、文本數據，以及系統生成的批閱結果、歷史錯題紀錄、各科學業表現分析（如學習進度條與雷達圖）。</p>
        </div>

        <div className="space-y-2 text-slate-600 dark:text-slate-300 mt-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">自動收集的技術數據 (Log Data)：</h3>
          <p className="pl-5">當您使用本應用程式時，我們可能會自動記錄某些日誌資訊，包含裝置型號、作業系統版本、IP 位址、應用程式崩潰日誌（Crash Logs）與使用行為數據，以用於系統穩定度監控與除錯。</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">二、 我們如何使用您的資訊</h2>
        <p className="text-slate-700 dark:text-slate-300">我們收集的資訊將嚴格限定於以下目的：</p>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
          <li><strong>提供與維持核心功能：</strong>處理您的註冊流程，並將您上傳的考卷影像轉化為文字，結合視覺語言模型（VLM）與大型語言模型（LLM）提供即時、個人化的學科批閱與解答。</li>
          <li><strong>服務優化與產品開發：</strong>在經過嚴格的「去識別化（De-identification）」處理後，您的匿名互動數據與錯題特徵將用於建立「感知數位指紋快取技術」，並協助我們持續訓練與優化臺灣在地化的教育演算法模型。</li>
          <li><strong>客戶服務與推播通知：</strong>用於回覆您的技術支援請求、處理客訴，或發送與帳號安全、訂閱狀態、系統重大更新相關的重要通知。</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">三、 資訊的分享與第三方服務揭露</h2>
        <p className="text-slate-700 dark:text-slate-300">我們承諾絕不向任何無關的第三方出售您的個人資料。我們僅在以下必要情況下，與受信任的合作夥伴分享資訊：</p>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
          <li><strong>雲端運算與基礎設施供應商：</strong>我們委託 Google Firebase 提供身分驗證與安全的雲端資料庫儲存服務。</li>
          <li><strong>人工智慧 (AI) 運算合作夥伴：</strong>為提供頂尖的批閱體驗，您上傳的圖像與文字資料會透過加密通道傳送至第三方 AI API（如 Google Gemini 或 OpenAI）。我們在此特別聲明：依據我們與前述供應商的企業級協議，您的所有輸入數據均「絕對不會」被用於訓練第三方供應商的通用基礎模型。</li>
          <li><strong>法律要求與權利保護：</strong>若依法規命令、法院傳票，或為保護本應用程式及其他使用者的合法權益與安全，我們可能需依法配合揭露必要資訊。</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">四、 資料安全與儲存期限</h2>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
          <li><strong>安全防護：</strong>我們採用業界標準的加密技術（如傳輸層安全性協定 TLS/SSL）來保護您的資料在傳輸與靜態儲存時的安全，防範未經授權的存取、竄改或資料外洩。</li>
          <li><strong>儲存期限：</strong>我們僅在為實現本政策所述目的之必要期間內保留您的資料。當您刪除帳號，或資料不再需要用於提供服務時，我們將進行永久刪除或匿名化處理。</li>
        </ul>
      </section>

      <section className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
        <h2 className="text-lg font-bold text-red-800 dark:text-red-400">五、 您的權利：資料存取與刪除 (Data Deletion)</h2>
        <p className="text-red-700 dark:text-red-300">我們尊重您對個人資料的絕對控制權，您享有以下權利：</p>
        <ul className="list-disc pl-5 space-y-2 text-red-700 dark:text-red-300">
          <li><strong>查閱與更正：</strong>您隨時可以在 App 內的「設定」或「個人檔案」頁面查看並更新您的帳號資訊。</li>
          <li>
            <strong>刪除帳號 (永久註銷)：</strong>
            <p className="mt-1">您可透過 App 內 [設定] &gt; [帳號管理] &gt; [刪除帳號] 的途徑，自行發起帳號註銷程序。</p>
            <p className="mt-1 font-semibold">重要提示：一旦執行刪除程序，系統將自雲端資料庫中「永久且不可逆」地抹除您的電子郵件、密碼、所有上傳的考卷紀錄與訂閱狀態。</p>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">六、 兒童與未成年人隱私保護</h2>
        <p className="text-slate-700 dark:text-slate-300">
          本應用程式之主要受眾包含高中學生。若您為當地法律規定之未成年人（在臺灣為未滿 18 歲），您必須在家長或法定監護人的陪同、閱讀並同意本隱私權政策後，方可註冊與使用本服務。若家長或監護人發現我們在未獲同意的情況下收集了未成年人的資訊，請立即透過客服信箱與我們聯繫，我們將盡速採取行動刪除相關資料。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">七、 隱私權政策之修訂</h2>
        <p className="text-slate-700 dark:text-slate-300">
          我們保留因應法規變動或業務需求，隨時修訂本隱私權政策之權利。當政策發生重大變更時，我們將透過應用程式內跳出視窗、推播通知或發送電子郵件的方式，在變更生效前提前通知您。您若繼續使用本應用程式，即視為接受修訂後的條款。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">八、 聯絡我們</h2>
        <p className="text-slate-700 dark:text-slate-300">
          如您對本隱私權政策、您的資料權益，或本應用程式的隱私實務有任何疑問或投訴，請隨時與我們的隱私權保護團隊聯繫。
        </p>
      </section>
    </div>
  );
}
