import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ActivityEntry } from '../types';
import {
  auth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  firebaseSignOut,
  onAuthStateChanged,
  type User
} from '../firebase';
import { userProgressService } from '../services/userProgressService';
import { getAnalyticsInstance, logEvent } from '../firebase';

/** 將 Firebase Auth 錯誤轉為使用者易懂的中文訊息（Smart Error Handling） */
function getAuthErrorMessage(err: unknown, context: 'signup' | 'signin' | 'google' | 'apple'): string {
  const code = (err as { code?: string })?.code;
  const msgMap: Record<string, string> = {
    'auth/email-already-in-use': '此信箱已註冊過。請切換至登入頁面，或直接使用 Google 登入。',
    'auth/account-exists-with-different-credential': '此 Email 已用其他方式註冊，請改用該方式登入（例如：若曾用 Email/密碼註冊，請切換到登入分頁）。',
    'auth/invalid-credential': context === 'signin'
      ? '帳號或密碼錯誤。請確認信箱與密碼無誤（注意是否有多餘空白）。若您當初使用第三方登入，請點擊下方 Google/Apple 按鈕。'
      : '帳號或密碼錯誤，請確認後再試。',
    'auth/user-not-found': '此帳號尚未註冊，請切換到「註冊」分頁建立帳號。',
    'auth/wrong-password': '帳號或密碼錯誤。請確認信箱與密碼無誤（注意是否有多餘空白）。若您當初使用第三方登入，請點擊下方 Google/Apple 按鈕。',
    'auth/weak-password': '密碼至少需 6 個字元。',
    'auth/invalid-email': 'Email 格式不正確，請檢查後再試。',
    'auth/operation-not-allowed': '電子郵件/密碼登入尚未啟用，請至 Firebase Console > Authentication > Sign-in method 啟用。',
    'auth/too-many-requests': '嘗試次數過多，請稍後再試。',
    'auth/network-request-failed': '網路連線失敗，請檢查網路後再試。',
    'auth/popup-blocked': '彈出視窗被阻擋，請允許此網站的彈出視窗後重試。',
    'auth/popup-closed-by-user': '已取消登入。',
    'auth/cancelled-popup-request': '請稍候，勿重複點擊。',
  };
  return msgMap[code ?? ''] ?? (err instanceof Error ? err.message : '操作失敗，請稍後再試。');
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isPro: boolean;
  credits: number;
}

interface AppContextType {
  user: any | null;
  profile: UserProfile | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  showAuth: boolean;
  setShowAuth: (show: boolean) => void;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  consumeCredit: () => void;
  upgradeToPro: () => void;
  activities: ActivityEntry[];
  logActivity: (entry: any) => void;
  customInstructions: string;
  setCustomInstructions: (val: string) => void;
  clearHistory: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  authErrorCode: string | null;
  setAuthErrorCode: (code: string | null) => void;
  authSuccessMessage: string | null;
  setAuthSuccessMessage: (msg: string | null) => void;
  authReady: boolean;
  updateProfileAvatar: (avatarUrl: string) => void;
  activeSubject: string;
  setActiveSubject: (s: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function firebaseUserToProfile(fbUser: User): UserProfile {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: fbUser.displayName ?? fbUser.email ?? '用戶',
    isPro: false,
    credits: 3
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string>('');

  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [customInstructions, setCustomInstructions] = useState(() => localStorage.getItem('asea_instructions') || '');

  // 1. 初始化 Theme 狀態 (優先讀取 LocalStorage，無紀錄才讀取系統設定)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('asea_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      // 如果沒有儲存的設定，回傳 'system' 標記，稍後在 useEffect 中處理
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 關鍵防呆：只有在 LocalStorage 沒有手動設定時，才聽從系統
      if (!localStorage.getItem('asea_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    // 必須加入這行：卸載時清除，阻斷 Log 洗版
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // 2. 絕對穩定的 DOM 更新機制
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
    
    // 同步寫入 localStorage
    localStorage.setItem('asea_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('asea_instructions', customInstructions);
  }, [customInstructions]);

  // 3. 實作手動切換功能
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const logActivity = useCallback((entry: any) => {
    const newEntry: ActivityEntry = {
      id: entry.id || Math.random().toString(36).substr(2, 9),
      type: entry.type,
      title: entry.title ?? '',
      description: entry.description ?? '',
      timestamp: entry.timestamp || Date.now(),
      data: entry.data,
    };
    setActivities(prev => [newEntry, ...prev]);
    if (user?.uid && newEntry.type === 'grading') {
      userProgressService.addActivity(user.uid, newEntry).catch(() => {});
      userProgressService.incrementGradingStats(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  const clearHistory = () => setActivities([]);

  /** 對外暴露的 setAuthError：傳入 null 時會同時清除 authErrorCode */
  const setAuthErrorOrClear = useCallback((err: string | null) => {
    setAuthError(err);
    if (err === null) setAuthErrorCode(null);
  }, []);

  // --- Firebase Auth 狀態同步（Popup 策略，避免 localhost 第三方 Cookie 遺失）---
  // 僅使用 onAuthStateChanged 作為唯一真相來源，不依賴 getRedirectResult
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return;
      setAuthReady(true);
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email ?? '' });
        const baseProfile = firebaseUserToProfile(fbUser);
        setProfile(baseProfile);
        setShowAuth(false);
        const analytics = getAnalyticsInstance();
        if (analytics) logEvent(analytics, 'user_login');
        userProgressService.recordLoginDay(fbUser.uid).catch(() => {});
        try {
          const progress = await userProgressService.ensureUserDoc(
            fbUser.uid,
            fbUser.displayName ?? fbUser.email ?? '用戶',
            fbUser.email ?? ''
          );
          if (progress?.isPro === true) {
            setProfile(prev => prev ? { ...prev, isPro: true } : prev);
          }
          if (progress?.avatarUrl) {
            setProfile(prev => prev ? { ...prev, avatarUrl: progress.avatarUrl } : prev);
          }
          const loaded = await userProgressService.getActivities(fbUser.uid);
          setActivities(loaded);
        } catch (err) {
          console.error('Load user progress/activities:', err);
        }
      } else {
        setUser(null);
        setProfile(null);
        setActivities([]);
        setShowAuth(true);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  /** Google / Apple 登入：全面使用 signInWithPopup，避免 localhost 下 Redirect 因第三方 Cookie 阻擋而失效 */
  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account', display: 'popup' });
      await signInWithPopup(auth, provider);
      setShowAuth(false);
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage(err, 'google'));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loginWithApple = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, new OAuthProvider('apple.com'));
      setShowAuth(false);
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage(err, 'apple'));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();
    setAuthError(null);
    setAuthErrorCode(null);
    setAuthSuccessMessage(null);
    setAuthLoading(true);
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      await sendEmailVerification(fbUser, {
        url: typeof window !== 'undefined' ? window.location.origin : '',
        handleCodeInApp: false
      });
      setAuthSuccessMessage('驗證信已發送，請至您的信箱點擊連結完成啟用。');
      // 立即更新登入狀態，不依賴 onAuthStateChanged 時序
      setUser({ uid: fbUser.uid, email: fbUser.email ?? '' });
      setProfile(firebaseUserToProfile(fbUser));
      setShowAuth(false);
      try {
        const progress = await userProgressService.ensureUserDoc(
          fbUser.uid,
          fbUser.displayName ?? fbUser.email ?? '用戶',
          fbUser.email ?? ''
        );
        if (progress?.isPro === true) {
          setProfile(prev => prev ? { ...prev, isPro: true } : prev);
        }
        const loaded = await userProgressService.getActivities(fbUser.uid);
        setActivities(loaded);
      } catch (err) {
        console.error('Load user progress/activities:', err);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? null;
      setAuthError(getAuthErrorMessage(err, 'signup'));
      setAuthErrorCode(code);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();
    setAuthError(null);
    setAuthErrorCode(null);
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      setShowAuth(false);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? null;
      setAuthError(getAuthErrorMessage(err, 'signin'));
      setAuthErrorCode(code);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (err: unknown) {
      console.error('Logout error:', err);
    } finally {
      setAuthLoading(false);
    }
  }, []);
  
  const consumeCredit = () => {
    if (!profile || profile.isPro) return;
    setProfile(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - 1) } : null);
  };
  
  const upgradeToPro = () => {
    setProfile(prev => prev ? { ...prev, isPro: true } : null);
    setShowPaywall(false);
  };

  const updateProfileAvatar = useCallback((avatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatarUrl } : null);
  }, []);

  return (
    <AppContext.Provider value={{
      user, profile, theme, toggleTheme, showAuth, setShowAuth, showPaywall, setShowPaywall,
      loginWithGoogle, loginWithApple, signUpWithEmail, loginWithEmail, logout, consumeCredit, upgradeToPro,
      activities, logActivity, customInstructions, setCustomInstructions, clearHistory,
      authLoading, authError, setAuthError: setAuthErrorOrClear, authErrorCode, setAuthErrorCode, authSuccessMessage, setAuthSuccessMessage, authReady,
      updateProfileAvatar,
      activeSubject, setActiveSubject
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
