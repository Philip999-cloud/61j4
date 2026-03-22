import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  userProgressService,
  type UserProgressDoc,
  type UserStatisticsDoc,
  type NotificationPreferences
} from '../services/userProgressService';
import {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  auth,
  onAuthStateChanged,
  linkWithPopup,
  unlink,
  GoogleAuthProvider,
  OAuthProvider
} from '../firebase';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  stats: {
    gradedPapers: number;
    timeSavedHours: number;
    activeDays: number;
  };
  bindings: {
    google: boolean;
    apple: boolean;
    facebook: boolean;
  };
  profileCompleteness: number;
  /** 學習統計（來自 users/{userId}/statistics/overview） */
  statistics: {
    totalQuestionsAnswered: number;
    overallAccuracy: number;
    currentStreak: number;
    subjectProgress: Record<string, { total: number; correct: number }>;
  };
  /** 通知偏好（來自 users/{userId}.preferences） */
  preferences: NotificationPreferences;
}

const EMPTY_PROFILE: UserProfile = {
  name: '',
  email: '',
  avatarUrl: 'https://picsum.photos/seed/user/200',
  stats: { gradedPapers: 0, timeSavedHours: 0, activeDays: 0 },
  bindings: { google: false, apple: false, facebook: false },
  profileCompleteness: 0,
  statistics: {
    totalQuestionsAnswered: 0,
    overallAccuracy: 0,
    currentStreak: 0,
    subjectProgress: {}
  },
  preferences: { pushEnabled: true, emailEnabled: true }
};

/** 從 Firebase Auth providerData 推導 bindings 狀態 */
function providerDataToBindings(providerData: Array<{ providerId: string }>): UserProfile['bindings'] {
  const ids = new Set(providerData.map((p) => p.providerId));
  return {
    google: ids.has('google.com'),
    apple: ids.has('apple.com'),
    facebook: ids.has('facebook.com')
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = { pushEnabled: true, emailEnabled: true };

function docToProfile(doc: UserProgressDoc | null, displayName: string, email: string): Omit<UserProfile, 'statistics'> {
  if (!doc) return { ...EMPTY_PROFILE, name: displayName, email };
  return {
    name: doc.displayName || displayName,
    email: doc.email || email,
    avatarUrl: doc.avatarUrl || 'https://picsum.photos/seed/user/200',
    stats: doc.stats ?? { gradedPapers: 0, timeSavedHours: 0, activeDays: 0 },
    bindings: doc.bindings ?? { google: false, apple: false, facebook: false },
    profileCompleteness: doc.profileCompleteness ?? 0,
    preferences: doc.preferences ?? DEFAULT_PREFERENCES
  };
}

function statisticsToProfileStats(stats: UserStatisticsDoc | null): UserProfile['statistics'] & { stats: UserProfile['stats'] } {
  if (!stats) {
    return {
      totalQuestionsAnswered: 0,
      overallAccuracy: 0,
      currentStreak: 0,
      subjectProgress: {},
      stats: { gradedPapers: 0, timeSavedHours: 0, activeDays: 0 }
    };
  }
  return {
    totalQuestionsAnswered: stats.totalQuestionsAnswered ?? 0,
    overallAccuracy: stats.overallAccuracy ?? 0,
    currentStreak: stats.currentStreak ?? 0,
    subjectProgress: stats.subjectProgress ?? {},
    stats: {
      gradedPapers: stats.gradedPapers ?? 0,
      timeSavedHours: stats.timeSavedHours ?? 0,
      activeDays: stats.activeDays ?? 0
    }
  };
}

export const useUserProfileManager = () => {
  const { user, profile: appProfile } = useAppContext();
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<Error | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isBindingLoading, setIsBindingLoading] = useState<string | null>(null);
  const [prefLoadingKey, setPrefLoadingKey] = useState<keyof NotificationPreferences | null>(null);

  /** 是否為新手（Firestore statistics 內尚無資料，且主檔也無批改紀錄） */
  const isNewUser = !statsLoading &&
    userProfile.statistics.totalQuestionsAnswered === 0 &&
    userProfile.statistics.overallAccuracy === 0 &&
    Object.keys(userProfile.statistics.subjectProgress).length === 0 &&
    userProfile.stats.gradedPapers === 0 &&
    userProfile.stats.timeSavedHours === 0;

  // 1. 載入主檔 users/{uid}（profile、avatar、bindings）
  useEffect(() => {
    if (!user?.uid || !appProfile) {
      setUserProfile(EMPTY_PROFILE);
      setIsLoading(false);
      setStatsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const progress = await userProgressService.getUserProgress(user.uid);
        if (cancelled) return;
        const base = docToProfile(progress, appProfile.displayName, appProfile.email);
        setUserProfile((prev) => ({
          ...base,
          statistics: prev.statistics,
          stats: prev.stats
        }));
      } catch (err) {
        console.error('useUserProfileManager fetch:', err);
        if (!cancelled) {
          const base = docToProfile(null, appProfile.displayName, appProfile.email);
          setUserProfile((prev) => ({ ...base, statistics: prev.statistics, stats: prev.stats }));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, appProfile?.displayName, appProfile?.email]);

  // 1.5 從 Firebase Auth providerData 同步 bindings（為唯一真相來源）
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser || fbUser.uid !== user.uid) return;
      const bindings = providerDataToBindings(fbUser.providerData ?? []);
      setUserProfile((prev) => ({ ...prev, bindings }));
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // 2. 實時監聽 users/{uid}/statistics/overview
  useEffect(() => {
    if (!user?.uid) {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    setStatsError(null);
    const unsubscribe = userProgressService.subscribeToStatistics(
      user.uid,
      (data) => {
        const merged = statisticsToProfileStats(data);
        setUserProfile((prev) => ({
          ...prev,
          statistics: {
            totalQuestionsAnswered: merged.totalQuestionsAnswered,
            overallAccuracy: merged.overallAccuracy,
            currentStreak: merged.currentStreak,
            subjectProgress: merged.subjectProgress
          },
          // 若 statistics 無資料，保留主檔 stats（向後相容既有用戶）
          stats: data ? merged.stats : prev.stats
        }));
        setStatsLoading(false);
      },
      (err) => {
        setStatsError(err);
        setStatsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  const updateAvatar = useCallback(async (file: File) => {
    if (!user?.uid) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('圖片大小不可超過 2MB');
      return;
    }
    setIsUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setUserProfile((prev) => ({ ...prev, avatarUrl: previewUrl }));

      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await userProgressService.updateAvatarUrl(user.uid, downloadUrl);
      setUserProfile((prev) => ({ ...prev, avatarUrl: downloadUrl }));

      URL.revokeObjectURL(previewUrl);
    } catch (err) {
      console.error('updateAvatar:', err);
      alert('上傳失敗，請稍後再試');
    } finally {
      setIsUploading(false);
    }
  }, [user?.uid]);

  const toggleAccountBinding = useCallback(async (provider: keyof UserProfile['bindings']) => {
    const fbUser = auth.currentUser;
    if (!user?.uid || !fbUser) return;

    const providerIdMap = { google: 'google.com', apple: 'apple.com', facebook: 'facebook.com' } as const;
    const providerId = providerIdMap[provider];
    const isConnected = fbUser.providerData?.some((p) => p.providerId === providerId) ?? false;

    setIsBindingLoading(provider);
    try {
      if (isConnected) {
        // 解除綁定：至少需保留一種登入方式
        const providerCount = fbUser.providerData?.length ?? 0;
        if (providerCount <= 1) {
          alert('至少需保留一種登入方式，無法解除最後一個帳號綁定。');
          return;
        }
        await unlink(fbUser, providerId);
        const newBindings = { ...userProfile.bindings, [provider]: false };
        await userProgressService.updateBindings(user.uid, newBindings);
        setUserProfile((prev) => ({ ...prev, bindings: { ...prev.bindings, [provider]: false } }));
      } else {
        // 綁定：使用 linkWithPopup
        const prov =
          provider === 'google'
            ? new GoogleAuthProvider()
            : provider === 'apple'
              ? new OAuthProvider('apple.com')
              : new OAuthProvider('facebook.com');
        prov.setCustomParameters?.({ prompt: 'select_account', display: 'popup' });
        await linkWithPopup(fbUser, prov);
        const newBindings = { ...userProfile.bindings, [provider]: true };
        await userProgressService.updateBindings(user.uid, newBindings);
        setUserProfile((prev) => ({ ...prev, bindings: { ...prev.bindings, [provider]: true } }));
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/credential-already-in-use') {
        alert('此社群帳號已被其他帳戶使用。');
      } else if (code === 'auth/provider-already-linked') {
        // 已連結，同步狀態即可
        setUserProfile((prev) => ({
          ...prev,
          bindings: { ...prev.bindings, [provider]: true }
        }));
      } else if (code === 'auth/popup-blocked') {
        alert('彈出視窗被阻擋，請允許此網站的彈出視窗後重試。');
      } else if (code === 'auth/popup-closed-by-user') {
        // 用戶關閉彈窗，不提示
      } else {
        console.error('toggleAccountBinding:', err);
        alert(err instanceof Error ? err.message : '操作失敗，請稍後再試。');
      }
    } finally {
      setIsBindingLoading(null);
    }
  }, [user?.uid, userProfile.bindings]);

  /** 供外部呼叫：用戶解完一題時更新進度 */
  const updateUserProgress = useCallback(
    async (updates: Partial<Omit<UserStatisticsDoc, 'updatedAt'>>) => {
      if (!user?.uid) return;
      try {
        await userProgressService.updateUserProgress(user.uid, updates);
        // onSnapshot 會自動更新 state，無需手動 set
      } catch (err) {
        console.error('updateUserProgress:', err);
        throw err;
      }
    },
    [user?.uid]
  );

  /** 切換通知偏好（即時寫入 Firestore，切換時禁用按鈕防抖） */
  const updateNotificationPreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!user?.uid) return;
      if (prefLoadingKey) return; // 防抖：已有請求進行中
      setPrefLoadingKey(key);
      const newPrefs = { ...userProfile.preferences, [key]: value };
      setUserProfile((prev) => ({ ...prev, preferences: newPrefs }));
      try {
        await userProgressService.updatePreferences(user.uid, newPrefs);
      } catch (err) {
        console.error('updateNotificationPreference:', err);
        setUserProfile((prev) => ({ ...prev, preferences: prev.preferences }));
        alert('更新失敗，請稍後再試。');
      } finally {
        setPrefLoadingKey(null);
      }
    },
    [user?.uid, userProfile.preferences, prefLoadingKey]
  );

  return {
    user: userProfile,
    isLoading: isLoading || statsLoading,
    statsLoading,
    statsError,
    isNewUser,
    isUploading,
    isBindingLoading,
    prefLoadingKey,
    updateAvatar,
    toggleAccountBinding,
    updateNotificationPreference,
    updateUserProgress,
    refreshProfile: useCallback(async () => {
      if (!user?.uid || !appProfile) return;
      try {
        const progress = await userProgressService.getUserProgress(user.uid);
        const base = docToProfile(progress, appProfile.displayName, appProfile.email);
        setUserProfile((prev) => ({ ...base, statistics: prev.statistics, stats: prev.stats }));
      } catch (err) {
        console.error('refreshProfile:', err);
      }
    }, [user?.uid, appProfile])
  };
};
