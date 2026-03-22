import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';

type AuthTab = 'signin' | 'signup';

export function AuthModal() {
  const {
    showAuth,
    setShowAuth,
    loginWithGoogle,
    loginWithApple,
    signUpWithEmail,
    loginWithEmail,
    authLoading,
    authError,
    setAuthError,
    authErrorCode,
    setAuthErrorCode,
    authSuccessMessage,
    setAuthSuccessMessage
  } = useAppContext();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 註冊時若信箱已存在（可能是 OAuth 註冊），自動切換至登入頁並保留 Email
  useEffect(() => {
    if (authErrorCode === 'auth/email-already-in-use' && tab === 'signup') {
      setTab('signin');
      setAuthErrorCode(null);
    }
  }, [authErrorCode, tab, setAuthErrorCode]);

  if (!showAuth) return null;

  const handleClose = () => {
    setAuthError(null);
    setAuthSuccessMessage(null);
    setShowAuth(false);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();
    if (!sanitizedEmail || !sanitizedPassword) {
      setAuthError('請填寫 Email 與密碼');
      return;
    }
    try {
      if (tab === 'signup') {
        await signUpWithEmail(sanitizedEmail, sanitizedPassword);
      } else {
        await loginWithEmail(sanitizedEmail, sanitizedPassword);
      }
    } catch {
      // authError 已由 context 設定
    }
  };

  if (authSuccessMessage) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
          <h2 className="text-2xl font-bold mb-2 dark:text-white">驗證信已發送</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{authSuccessMessage}</p>
          <button
            onClick={handleClose}
            className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700"
          >
            確定
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">登入以繼續</h2>
        {authError ? (
          <p className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4 text-sm">
            {authError}
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            儲存您的評分紀錄並獲取每日免費額度。
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setTab('signin'); setAuthError(null); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              tab === 'signin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            登入
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setAuthError(null); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              tab === 'signup'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            註冊
          </button>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {authLoading ? '處理中...' : tab === 'signup' ? '註冊並發送驗證信' : '登入'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
          <span className="text-sm text-gray-500">或</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
        </div>

        <div className="space-y-2">
          <button
            onClick={loginWithGoogle}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            使用 Google 繼續
          </button>
          <button
            onClick={loginWithApple}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 bg-black text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            使用 Apple 繼續
          </button>
        </div>

        <button onClick={handleClose} className="mt-6 w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          稍後再說
        </button>
      </div>
    </div>
  );
}

export function PaywallModal() {
 const { showPaywall, setShowPaywall, upgradeToPro } = useAppContext();
 if (!showPaywall) return null;
 return (
   <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
     <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative">
       <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-gray-500 text-2xl">×</button>
       <h2 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">解鎖 Pro 方案</h2>
       <p className="text-center text-gray-600 dark:text-gray-300 mb-8">免費額度已用盡，升級解鎖無限潛能！</p>
       <button onClick={upgradeToPro} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl">立即升級 (模擬購買)</button>
     </div>
   </div>
 );
}
