import React from 'react';
import { useAppContext } from '@/contexts/AppContext';

export function AuthModal() {
  const { showAuth, setShowAuth, loginWithGoogle } = useAppContext();

  if (!showAuth) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">登入以繼續</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">登入即可儲存評分紀錄，並獲取每日免費額度。</p>
        
        <button 
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          使用 Google 繼續
        </button>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={() => setShowAuth(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2"
          >
            稍後再說
          </button>
        </div>
      </div>
    </div>
  );
}
