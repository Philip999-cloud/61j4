import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ActivityEntry } from '../types';

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export interface UserProgressDoc {
  displayName: string;
  email: string;
  avatarUrl?: string;
  isPro?: boolean;
  stats: {
    gradedPapers: number;
    timeSavedHours: number;
    activeDays: number;
  };
  profileCompleteness: number;
  bindings: { google: boolean; apple: boolean; facebook: boolean };
  preferences?: NotificationPreferences;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

const DEFAULT_STATS = {
  gradedPapers: 0,
  timeSavedHours: 0,
  activeDays: 0
};

const DEFAULT_BINDINGS = { google: false, apple: false, facebook: false };

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true
};

/** Firestore 路徑: users/{userId}/statistics/overview */
export interface UserStatisticsDoc {
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  currentStreak: number;
  subjectProgress: Record<string, { total: number; correct: number }>;
  gradedPapers: number;
  timeSavedHours: number;
  activeDays: number;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

export const DEFAULT_STATISTICS: Omit<UserStatisticsDoc, 'updatedAt'> = {
  totalQuestionsAnswered: 0,
  overallAccuracy: 0,
  currentStreak: 0,
  subjectProgress: {},
  gradedPapers: 0,
  timeSavedHours: 0,
  activeDays: 0
};

const STATISTICS_DOC_ID = 'overview';

/** Firestore 不支援巢狀陣列，將巢狀陣列序列化為 JSON 字串 */
function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    const hasNestedArray = obj.some((x) => Array.isArray(x));
    if (hasNestedArray) {
      return { __fsNestedArray: true, value: JSON.stringify(obj) };
    }
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitizeForFirestore(v);
    }
    return result;
  }
  return obj;
}

/** 還原序列化的巢狀陣列 */
function rehydrateFromFirestore(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object' && obj !== null && '__fsNestedArray' in obj && (obj as any).__fsNestedArray === true) {
    try {
      return JSON.parse((obj as any).value);
    } catch {
      return obj;
    }
  }
  if (Array.isArray(obj)) {
    return obj.map(rehydrateFromFirestore);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = rehydrateFromFirestore(v);
    }
    return result;
  }
  return obj;
}

export const userProgressService = {
  async getUserProgress(uid: string): Promise<UserProgressDoc | null> {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as UserProgressDoc;
      }
      return null;
    } catch (err) {
      console.error('userProgressService.getUserProgress:', err);
      return null;
    }
  },

  async ensureUserDoc(
    uid: string,
    displayName: string,
    email: string,
    avatarUrl?: string
  ): Promise<UserProgressDoc> {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as UserProgressDoc;
      }
      const newDoc: Omit<UserProgressDoc, 'updatedAt'> & { updatedAt: any } = {
        displayName,
        email,
        avatarUrl: avatarUrl ?? '',
        stats: { ...DEFAULT_STATS },
        profileCompleteness: 60,
        bindings: { ...DEFAULT_BINDINGS, google: true },
        updatedAt: serverTimestamp()
      };
      await setDoc(ref, newDoc);
      return newDoc as UserProgressDoc;
    } catch (err) {
      console.error('userProgressService.ensureUserDoc:', err);
      return {
        displayName,
        email,
        avatarUrl: avatarUrl ?? '',
        stats: { ...DEFAULT_STATS },
        profileCompleteness: 60,
        bindings: { ...DEFAULT_BINDINGS, google: true },
        updatedAt: serverTimestamp() as any
      };
    }
  },

  async incrementGradingStats(uid: string): Promise<void> {
    try {
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, {
        'stats.gradedPapers': increment(1),
        'stats.timeSavedHours': increment(0.5),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('userProgressService.incrementGradingStats:', err);
    }
  },

  async addActivity(uid: string, entry: ActivityEntry): Promise<void> {
    const write = async () => {
      const col = collection(db, 'users', uid, 'activities');
      const sanitized = sanitizeForFirestore({
        ...entry,
        timestamp: entry.timestamp
      }) as Record<string, unknown>;
      await addDoc(col, sanitized);
    };
    const writeWithRetry = async (retries = 1) => {
      try {
        await write();
      } catch (e: any) {
        const isNetwork =
          e?.code === 'unavailable' || e?.message?.includes('QUIC');
        if (isNetwork && retries > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          return writeWithRetry(retries - 1);
        }
        console.warn('Firestore addActivity failed:', e?.message);
      }
    };
    await writeWithRetry();
  },

  async getActivities(uid: string, maxCount = 50): Promise<ActivityEntry[]> {
    try {
      const col = collection(db, 'users', uid, 'activities');
      const q = query(col, orderBy('timestamp', 'desc'), limit(maxCount));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const raw = d.data();
        const data = rehydrateFromFirestore(raw) as typeof raw;
        return {
          id: data.id ?? d.id,
          type: data.type,
          title: data.title,
          description: data.description,
          timestamp: data.timestamp,
          data: data.data
        } as ActivityEntry;
      });
    } catch (err) {
      console.error('userProgressService.getActivities:', err);
      return [];
    }
  },

  async updateActiveDays(uid: string, activeDays: number): Promise<void> {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? snap.data() : {};
      await setDoc(ref, {
        ...existing,
        stats: { ...(existing.stats ?? DEFAULT_STATS), activeDays },
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('userProgressService.updateActiveDays:', err);
    }
  },

  /** 登入時呼叫：若為新的一天則累加 activeDays */
  async recordLoginDay(uid: string): Promise<void> {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? snap.data() : {};
      const today = new Date().toDateString();
      const lastLoginDate = existing?.lastLoginDate ?? '';
      const currentActive = existing?.stats?.activeDays ?? 0;
      if (lastLoginDate !== today) {
        await setDoc(ref, {
          ...existing,
          lastLoginDate: today,
          stats: { ...(existing.stats ?? DEFAULT_STATS), activeDays: currentActive + 1 },
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.error('userProgressService.recordLoginDay:', err);
    }
  },

  async updateProfileCompleteness(uid: string, score: number): Promise<void> {
    try {
      const ref = doc(db, 'users', uid);
      await setDoc(ref, {
        profileCompleteness: Math.min(100, Math.max(0, score)),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('userProgressService.updateProfileCompleteness:', err);
    }
  },

  async setUserPro(uid: string, isPro: boolean): Promise<void> {
    try {
      const ref = doc(db, 'users', uid);
      await setDoc(ref, {
        isPro,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('userProgressService.setUserPro:', err);
    }
  },

  async updateAvatarUrl(uid: string, avatarUrl: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        avatarUrl,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('userProgressService.updateAvatarUrl:', err);
      throw err;
    }
  },

  /**
   * 更新 users/{userId} 的 bindings 欄位（與 Firebase Auth providerData 同步）
   */
  async updateBindings(
    uid: string,
    bindings: { google: boolean; apple: boolean; facebook: boolean }
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        bindings,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('userProgressService.updateBindings:', err);
      throw err;
    }
  },

  /**
   * 更新 users/{userId} 的 preferences 欄位（通知設定）
   */
  async updatePreferences(
    uid: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        preferences: {
          pushEnabled: preferences.pushEnabled,
          emailEnabled: preferences.emailEnabled
        },
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('userProgressService.updatePreferences:', err);
      throw err;
    }
  },

  /**
   * 訂閱 users/{userId}/statistics/overview 的實時更新
   * @returns unsubscribe 函數，用於 useEffect cleanup
   */
  subscribeToStatistics(
    uid: string,
    onData: (data: UserStatisticsDoc | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    const docRef = doc(db, 'users', uid, 'statistics', STATISTICS_DOC_ID);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onData(snap.data() as UserStatisticsDoc);
        } else {
          onData(null);
        }
      },
      (err) => {
        console.error('userProgressService.subscribeToStatistics:', err);
        onError?.(err);
        onData(null);
      }
    );
  },

  /**
   * 確保 statistics 文檔存在，若不存在則建立預設值
   */
  async ensureStatisticsDoc(uid: string): Promise<UserStatisticsDoc> {
    const docRef = doc(db, 'users', uid, 'statistics', STATISTICS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserStatisticsDoc;
    }
    const newDoc: Omit<UserStatisticsDoc, 'updatedAt'> & { updatedAt: any } = {
      ...DEFAULT_STATISTICS,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, newDoc);
    return newDoc as UserStatisticsDoc;
  },

  /**
   * 更新用戶學習進度（供外部呼叫，例如用戶解完一題時）
   */
  async updateUserProgress(
    uid: string,
    updates: Partial<Omit<UserStatisticsDoc, 'updatedAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid, 'statistics', STATISTICS_DOC_ID);
      const snap = await getDoc(docRef);
      const flatUpdates: Record<string, unknown> = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      if (snap.exists()) {
        await updateDoc(docRef, flatUpdates);
      } else {
        await setDoc(docRef, {
          ...DEFAULT_STATISTICS,
          ...flatUpdates
        });
      }
    } catch (err) {
      console.error('userProgressService.updateUserProgress:', err);
      throw err;
    }
  }
};
