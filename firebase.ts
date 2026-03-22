import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithPopup,
  unlink,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser as firebaseDeleteUser,
  type User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAnalytics, logEvent as firebaseLogEvent, type Analytics } from 'firebase/analytics';

// 從 .env 讀取 Firebase Config（變數需以 VITE_ 開頭才能在 Vite 中暴露）
const trim = (v: string | undefined) => (v ?? '').trim();
const firebaseConfig = {
  apiKey: trim(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: trim(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trim(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: trim(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: trim(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: trim(import.meta.env.VITE_FIREBASE_APP_ID),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firebase 將「目前網址列的主機名」與 Authorized domains 比對；127.0.0.1、區網 IP 與 localhost 分開計。
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const needsOauthDomainHint =
    host === '127.0.0.1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
  if (needsOauthDomainHint && !sessionStorage.getItem('_asea_fb_oauth_domain_hint')) {
    sessionStorage.setItem('_asea_fb_oauth_domain_hint', '1');
    console.info(
      `[ASEA Firebase] OAuth 需授權目前網域：請到 Firebase Console → Authentication → Settings → Authorized domains 新增「${host}」（127.0.0.1 與 localhost 須分開加）。詳見 FIREBASE_SETUP.md §5.2`
    );
  }
}
export const db = getFirestore(app);
export const storage = getStorage(app);

// Re-export auth helpers for use in AppContext
export {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithPopup,
  unlink,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  firebaseSignOut,
  firebaseDeleteUser,
  onAuthStateChanged
};
export { ref, uploadBytes, getDownloadURL };
export type { User };

// Firebase Analytics（僅在瀏覽器環境初始化）
let analytics: Analytics | null = null;
export function getAnalyticsInstance(): Analytics | null {
  if (typeof window !== 'undefined' && !analytics) {
    analytics = getAnalytics(app);
  }
  return analytics;
}
export { firebaseLogEvent as logEvent };
