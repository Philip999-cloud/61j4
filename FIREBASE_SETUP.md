# Firebase 設定指南

## 一、取得 Firebase Config

1. 開啟 [Firebase Console](https://console.firebase.google.com/)
2. 選擇您的專案（或建立新專案）
3. 點擊左側 **專案設定**（齒輪圖示）
4. 在「一般」分頁，捲動到 **「您的應用程式」**
5. 若尚未新增 Web 應用程式，點擊 `</>` 圖示新增
6. 複製 `firebaseConfig` 物件中的各欄位值

## 二、填入 .env

將取得的數值填入專案根目錄的 `.env` 檔案：

```
VITE_FIREBASE_API_KEY=您的_apiKey
VITE_FIREBASE_AUTH_DOMAIN=您的_authDomain（通常為 專案ID.firebaseapp.com）
VITE_FIREBASE_PROJECT_ID=您的_projectId
VITE_FIREBASE_STORAGE_BUCKET=您的_storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=您的_messagingSenderId
VITE_FIREBASE_APP_ID=您的_appId
```

## 三、啟用登入方式

### 3.1 Google 登入

1. 在 Firebase Console 左側選單點擊 **Authentication**
2. 點擊 **Sign-in method** 分頁
3. 在「登入提供者」清單中找到 **Google**
4. 點擊 **Google** 進入設定
5. 將 **啟用** 開關打開
6. 設定 **專案支援電子郵件**（用於 OAuth 同意畫面）
7. 點擊 **儲存**

### 3.2 Email / 密碼登入（含驗證信）

1. 在 Sign-in method 中找到 **電子郵件/密碼**
2. 啟用 **電子郵件/密碼**
3. （可選）啟用 **電子郵件連結** 若需 Magic Link
4. 點擊 **儲存**

### 3.3 Apple 登入

1. 在 Sign-in method 中找到 **Apple**
2. 啟用 **Apple**
3. 依 Firebase 指示設定 Apple Developer 帳號與 Service ID
4. 點擊 **儲存**

**直接連結：** [Firebase Console - 登入方法](https://console.firebase.google.com/project/_/authentication/providers)  
（請將 `_` 替換為您的專案 ID）

## 3.4 Storage 規則（大頭貼上傳）

1. 在 Firebase Console 左側選單點擊 **Storage**
2. 點擊 **規則** 分頁
3. 設定允許已登入用戶上傳至 `avatars/{userId}/` 路徑，例如：

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 四、金流與訂閱 API（Phase 3）

在 `.env` 中設定：

```
VITE_PAYMENT_API_URL=https://your-backend.com/api/payment
VITE_SUBSCRIPTION_API_URL=https://your-backend.com/api/subscription
```

- **VITE_PAYMENT_API_URL**：購買時 POST `{ productId, userId }`，成功回傳 `{ success: true }`
- **VITE_SUBSCRIPTION_API_URL**：訂閱管理，`/grace?userId=xxx` 檢查 grace period，POST `{ action: 'cancel', userId }` 取消訂閱

若未設定，購買按鈕會回傳失敗，需實作後端金流後才能正常升級。

## 五、授權網域（必做，否則 OAuth 會失敗）

若瀏覽器 Console 出現：

> `The current domain is not authorized for OAuth operations`  
> `Add your domain (...) to the OAuth redirect domains list in Firebase console -> Authentication -> Settings -> Authorized domains`

代表**目前網址的主機名**不在 Firebase 允許清單中，`signInWithPopup` / `signInWithRedirect` / `linkWithPopup` 等**一律無法使用**（與程式碼無關，必須在後台新增網域）。

### 5.1 操作步驟

1. 開啟 [Firebase Console](https://console.firebase.google.com/) → 選擇**與 `.env` 中 `VITE_FIREBASE_PROJECT_ID` 相同**的專案  
2. 左側 **Authentication**（驗證）→ 上方 **Settings**（設定）  
3. 捲到 **Authorized domains**（授權網域）  
4. 點 **Add domain**（新增網域），**只填主機名，不要含 `https://` 或路徑**

### 5.2 本專案建議至少加入

| 用途 | 要新增的網域（範例） |
|------|----------------------|
| 本機開發（`http://localhost:...`） | `localhost`（Firebase 專案通常已內建） |
| 本機開發（`http://127.0.0.1:...`） | **`127.0.0.1`**（**必須另外加**，與 `localhost` **不是**同一筆） |
| 手機／同網段測試（Vite Network 網址） | 終端顯示的 **IPv4 主機名**，例如 `192.168.1.23`、`172.20.10.4`（每台／每個網段可能不同） |
| Vercel 正式網域 | `asea-smart-education.vercel.app` |
| 自訂網域（若已綁定） | 例如 `www.yourdomain.com` |
| Vercel **Preview** 部署 | 每次預覽網址不同，需把該次的主機名一併加入，例如 `asea-smart-education-xxxx.vercel.app`（Firebase **不支援** `*.vercel.app` 萬用字元） |

新增後約 **1～2 分鐘** 內生效，再重新整理頁面後重試 Google / Apple 登入。

若你暫時不想改 Firebase 設定，也可改在瀏覽器使用 **`http://localhost:埠號/`** 開本機站點（在已內建 `localhost` 授權的前提下），但 **`127.0.0.1` 與區網 IP 仍建議加入**，否則換網址測試時 OAuth 仍會失敗。

### 5.3 與 `authDomain` 的關係

- `.env` 的 `VITE_FIREBASE_AUTH_DOMAIN` 請維持 **Firebase 控制台顯示的值**（多為 `您的專案ID.firebaseapp.com`），**不要**改成 `asea-smart-education.vercel.app`。  
- **授權網域**是「瀏覽器網址列上的網站網域」；**authDomain** 是 Firebase 專案的主機，兩者不同。

### 5.4 若已加網域仍失敗

- 確認 Vercel **Production** 與 **Preview** 用的是否為不同子網域（Preview 要另外加）。  
- Google 登入另可到 [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → 與 Firebase 連動的 OAuth 2.0 Client → **Authorized JavaScript origins** 是否包含 `https://asea-smart-education.vercel.app`（多數情況下只設 Firebase 授權網域即可）。

## 六、驗證

完成後執行 `npm run dev`，點擊「使用 Google 繼續」應可正常開啟 Google 登入視窗。

## 七、已知 Console 警告（可忽略）

開發時可能出現以下訊息，通常不影響登入功能：

- **`/__/firebase/init.json 404`**：本專案已透過 Vite 中介層提供此檔案，若仍出現可忽略。
- **`Invalid argument provided to downgrade MDL nodes`**：Firebase Auth 內部 Material Design 清理時產生的錯誤，登入流程仍可正常完成。
