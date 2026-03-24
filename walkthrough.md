# 金鑰外洩善後：操作 walkthrough

您**必須親自**在 Google Cloud／Firebase 主控台完成「重新產生金鑰」；其餘本機與 GitHub 步驟可依此檔執行或已代為處理。

## 一、您必須親自執行：輪替（Rotate）金鑰

1. 登入 [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**。
2. 找到外洩的 **Gemini／Generative Language** 相關 API key → **Regenerate**（或刪除後新建）。
3. 登入 [Firebase Console](https://console.firebase.google.com/) → 專案設定 → **一般** → 您的 Web 應用程式 → 若 Firebase 使用可旋轉的 Web API key，依控制台指示更新（部分專案需於 Google Cloud 憑證頁一併管理）。
4. 為新金鑰設定 **API restrictions** 與 **Application restrictions**（HTTP referrer／IP），降低再次被濫用風險。
5. 檢查 **Billing** 與 **API 用量** 是否有異常。

完成後，將新值填入本機 **`0315 project/.env`**（已預留 `YOUR_NEW_*` 占位符），並在 Vercel／其他託管平台更新同名環境變數。

## 二、已代為處理（本機）

- **`asea-laptop-test`**：已從已追蹤的 `assets/*.js` 建置檔中**移除內嵌的舊 API key 字串**（先前 Vite 把 `VITE_*` 打進 bundle，等同公開金鑰）。
- 已新增 **`asea-laptop-test/.gitignore`**，避免日後誤提交 `.env`。
- **`0315 project/.env`**：已修正 Firebase 等變數格式（等號後勿加空格／多餘引號，以免載入失敗）。

## 三、GitHub：`asea-laptop-test` 公開歷史

僅刪除檔案無法從 Git 歷史移除敏感內容。可擇一：

### 選項 A（建議測試用 repo）：刪除整個 Repository

1. GitHub → `Philip999-cloud/asea-laptop-test` → **Settings** → 最底 **Danger Zone** → **Delete this repository**。

### 選項 B：保留 repo，但清掉歷史中的金鑰

若已在本機執行「單一乾淨提交 + 強制推送」，遠端 `master` 將只剩不含舊金鑰字串的內容（舊 commit 會被取代）。

若您未強推成功，可於本機 `asea-laptop-test` 目錄手動執行：

```powershell
cd "C:\Users\DELL\Downloads\asea-laptop-test"
git checkout --orphan clean-main
git add -A
git commit -m "chore: scrub embedded keys from bundles; history reset"
git branch -D master
git branch -m master
git push -f origin master
```

**注意**：`git push -f` 會改寫遠端歷史，其他協作者需重新 clone。

另可對 **`0312-project`** 等曾含 `.env` 的 repo 使用 [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) 或 `git filter-repo` 清除歷史中的 `.env` 檔。

## 四、重新產生可公開的測試建置（輪替金鑰之後）

1. 在 **`0315 project`** 填好新 `.env`。
2. `npm run build`
3. `npm run pack`（或依您慣用流程將 `dist` 複製到 `asea-laptop-test`）。
4. 在 `asea-laptop-test` 目錄 `git add -A`、`git commit`、`git push`（若未刪 repo）。

## 五、長期習慣

- 永遠不要 `git add .env`；僅提交 `.env.example` 占位符。
- 前端 **`VITE_*` 變數會進入 bundle**，任何人都能在瀏覽器看到；務必為這類 key 設定 **Referrer 限制**，敏感邏輯盡量放後端／Vercel Serverless。

完成「**一、輪替金鑰**」與「**三、GitHub 歷史或刪 repo**」後，風險才算完整收斂。
