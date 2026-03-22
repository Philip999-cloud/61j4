import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, User, Activity, Settings, HelpCircle, Camera, Mail, 
  ChevronRight, Star, Zap, CreditCard, Share2, Heart, Clock, 
  Shield, Lock, LogOut, Trash2, Moon, Bell, Eye, 
  MessageSquare, AlertTriangle, FileText, History, Send, ThumbsUp, ThumbsDown,
  ArrowLeft, CheckCircle, AlertCircle, RefreshCw, LifeBuoy, Loader2
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useFavorites } from '../hooks/useFavorites';
import { useSupportInteractions } from '../hooks/useSupportInteractions';
import { useToast } from '../contexts/ToastContext';
import AseaWhitepaper from './common/AseaWhitepaper';
import PrivacyPolicyView from './common/PrivacyPolicyView';
import { startProfileTour, startActivityTour, startSettingsTour, startSupportTour } from '../utils/tourConfig';
import { auth, sendPasswordResetEmail, firebaseDeleteUser } from '../firebase';
import { userProgressService } from '../services/userProgressService';
import { userSettingsService } from '../services/userSettingsService';
import { submitContactForm, sendContactEmailViaEmailJS } from '../services/contactSupportService';
import { getAnalyticsInstance, logEvent } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, storage, ref, uploadBytes, getDownloadURL } from '../firebase';

// 訪客/未登入時顯示的灰白色人像 SVG（類似 Google 預設頭像）
const DEFAULT_AVATAR_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-slate-400">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

// Types
type Tab = 'profile' | 'activity' | 'settings' | 'support';
type SupportView = 'main' | 'ai-chat' | 'issue' | 'history' | 'whitepaper' | 'privacy';
type ActivitySubView = 'main' | 'favorites-history' | 'orders-progress' | 'wallet' | 'referral';
type ModalType = 'logout' | 'clearCache' | 'deleteAccount' | 'addCard' | null;

interface EnterpriseUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onViewHistory?: (data: any, title: string) => void;
  initialTab?: 'profile' | 'support' | null;
}

export default function EnterpriseUserDrawer({ isOpen, onClose, onViewHistory, initialTab }: EnterpriseUserDrawerProps) {
  const { user, profile: appProfile, theme, toggleTheme, setShowPaywall, logout: contextLogout, activities, updateProfileAvatar } = useAppContext();
  const { favorites, toggleFavorite } = useFavorites();
  const { messages: supportMessages, isTyping: supportTyping, sendMessage: supportSendMessage } = useSupportInteractions();
  const toast = useToast();

  // --- State Management ---
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [supportView, setSupportView] = useState<SupportView>('main');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activitySubView, setActivitySubView] = useState<ActivitySubView>('main');
  const [isLoadingSubView, setIsLoadingSubView] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // 真實資料：來自 Firestore users/{uid}
  const [userProgress, setUserProgress] = useState<{ stats?: { gradedPapers?: number; activeDays?: number }; avatarUrl?: string } | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [settings, setSettings] = useState({ notifications: true, isPrivateProfile: false });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeFavTab, setActiveFavTab] = useState<'fav' | 'hist'>('fav');

  // Support State
  const [issueType, setIssueType] = useState('vlm-error');
  const [issueDesc, setIssueDesc] = useState('');
  const [showCSAT, setShowCSAT] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 顯示用資料（來自 Firebase Auth + Firestore）
  const displayName = appProfile?.displayName ?? '';
  const displayEmail = appProfile?.email ?? user?.email ?? '';
  const avatarUrl = userProgress?.avatarUrl || auth.currentUser?.photoURL || '';
  const isLoggedIn = !!user?.uid;

  // --- Effects: 載入用戶進度與設定 ---
  useEffect(() => {
    if (!user?.uid) {
      setUserProgress(null);
      setProgressLoading(false);
      setSettingsLoading(false);
      return;
    }
    let cancelled = false;
    setProgressLoading(true);
    userProgressService.getUserProgress(user.uid).then((doc) => {
      if (cancelled) return;
      setUserProgress(doc);
    }).catch(() => {
      if (!cancelled) setUserProgress(null);
    }).finally(() => {
      if (!cancelled) setProgressLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    setSettingsLoading(true);
    userSettingsService.getSettings(user.uid).then((s) => {
      if (cancelled) return;
      setSettings((prev) => ({ ...prev, isPrivateProfile: s.isPrivateProfile }));
    }).finally(() => {
      if (!cancelled) setSettingsLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      
      // 動態產生專屬的 LocalStorage Key
      const tourKey = `tour_uc_${activeTab}`;
      const hasToured = localStorage.getItem(tourKey);
      
      if (!hasToured) {
        // 等待 600ms 讓畫面完全切換後再打光
        const timer = setTimeout(() => {
          if (activeTab === 'profile') startProfileTour();
          if (activeTab === 'activity') startActivityTour();
          if (activeTab === 'settings') startSettingsTour();
          if (activeTab === 'support') startSupportTour();
          localStorage.setItem(tourKey, 'true');
        }, 600);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]); // 👈 這裡加上了 activeTab

  useEffect(() => {
    if (supportView === 'ai-chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [supportMessages, supportView]);

  // --- Handlers ---
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSupportView('main'); // Reset support view on tab change
    setActivitySubView('main'); // Reset activity sub-view on tab change
  };

  const handleActivitySubViewChange = (view: ActivitySubView) => {
    if (view === 'main') {
      setActivitySubView('main');
      return;
    }
    setIsLoadingSubView(true);
    setTimeout(() => {
      setActivitySubView(view);
      setIsLoadingSubView(false);
    }, 300);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    supportSendMessage(chatInput);
    setChatInput('');
  };

  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const handleSubmitIssue = async () => {
    if (!issueDesc.trim()) return;
    if (!user?.uid) {
      toast.error('請先登入以提交客服回報');
      return;
    }
    setIssueSubmitting(true);
    try {
      const data = { issueType, description: issueDesc, userEmail: displayEmail, uid: user.uid };
      await submitContactForm(data);
      const sent = await sendContactEmailViaEmailJS(data);
      if (sent) {
        toast.success('已送出，我們將盡快回覆您！');
      } else {
        toast.success('已收到您的回報，客服將盡快處理。');
      }
      setShowCSAT(true);
      setIssueDesc('');
    } catch (err) {
      toast.error('送出失敗，請稍後再試。');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const handlePasswordReset = useCallback(async () => {
    const email = auth.currentUser?.email ?? displayEmail;
    if (!email) {
      toast.error('無法取得您的信箱，請先完成信箱驗證。');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('密碼重設信已發送至您的信箱，請查收。');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/too-many-requests') {
        toast.error('請求過於頻繁，請稍後再試。');
      } else {
        toast.error('發送失敗，請確認信箱是否正確。');
      }
    }
  }, [displayEmail, toast]);

  const handlePrivacyModeChange = useCallback(async (v: boolean) => {
    if (!user?.uid) return;
    setSettings((prev) => ({ ...prev, isPrivateProfile: v }));
    try {
      await userSettingsService.updatePrivacyMode(user.uid, v);
      toast.success('隱私設定已更新');
    } catch {
      setSettings((prev) => ({ ...prev, isPrivateProfile: !v }));
      toast.error('更新失敗，請稍後再試');
    }
  }, [user?.uid, toast]);

  const handleConfirmAction = async () => {
    if (modalType === 'logout') {
      try {
        await contextLogout();
        toast.success('已登出');
        getAnalyticsInstance() && logEvent(getAnalyticsInstance()!, 'user_logout');
      } catch {
        toast.error('登出失敗');
      }
    } else if (modalType === 'clearCache') {
      toast.success('快取已清除');
    } else if (modalType === 'deleteAccount') {
      if (deleteConfirmText !== 'DELETE') {
        toast.error('請輸入 DELETE 以確認');
        return;
      }
      const fbUser = auth.currentUser;
      if (!fbUser) return;
      try {
        const uid = fbUser.uid;
        await firebaseDeleteUser(fbUser);
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
        toast.success('帳號已刪除');
        getAnalyticsInstance() && logEvent(getAnalyticsInstance()!, 'user_delete_account');
        onClose();
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === 'auth/requires-recent-login') {
          toast.error('為確保安全，請重新登入後再執行刪除帳號。');
          handlePasswordReset();
        } else {
          toast.error('刪除失敗，請稍後再試');
        }
      }
    } else if (modalType === 'addCard') {
      toast.info('此功能需串接金流 API，敬請期待。');
    }
    setModalType(null);
    setDeleteConfirmText('');
  };

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!user?.uid || file.size > 2 * 1024 * 1024) {
      toast.error('圖片不可超過 2MB');
      return;
    }
    setAvatarUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await userProgressService.updateAvatarUrl(user.uid, url);
      setUserProgress((prev) => (prev ? { ...prev, avatarUrl: url } : { avatarUrl: url }));
      updateProfileAvatar(url);
      toast.success('大頭貼已更新');
    } catch {
      toast.error('上傳失敗，請稍後再試');
    } finally {
      setAvatarUploading(false);
    }
  }, [user?.uid, toast, updateProfileAvatar]);

  const handleShare = async () => {
    const shareData = {
      title: 'ASEA - AI 智慧教育助手',
      text: '快來使用 ASEA AI 批改助手，讓學習更聰明、更高效！',
      url: window.location.origin,
    };

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success('已複製連結與推廣文案！');
      } catch (err) {
        toast.error('您的瀏覽器不支援分享功能，請手動複製網址。');
      }
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('分享成功');
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        console.error('Share failed:', err);
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  };

  const handleTransferToHuman = () => {
    supportSendMessage('請轉接真人客服');
  };

  const handleCSAT = (rating: string) => {
    toast.success(`感謝您的 ${rating} 回饋！我們會持續改進。`);
    setShowCSAT(false);
    setSupportView('main');
  };

  // --- Render Helpers ---
  if (!isOpen && !isAnimating) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`relative w-full md:w-[480px] bg-[var(--bg-main)] h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div id="tour-user-header" className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--bg-main)]/80 backdrop-blur-md z-10 transition-colors">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">用戶中心</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)] px-2 overflow-x-auto no-scrollbar transition-colors">
          <TabButton id="tour-tab-profile" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} icon={User} label="個人資料" />
          <TabButton id="tour-tab-activity" active={activeTab === 'activity'} onClick={() => handleTabChange('activity')} icon={Activity} label="活動" />
          <TabButton id="tour-tab-settings" active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={Settings} label="設定" />
          <TabButton id="tour-tab-support" active={activeTab === 'support'} onClick={() => handleTabChange('support')} icon={HelpCircle} label="支援" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] custom-scrollbar transition-colors">
          
          {/* --- Profile Tab --- */}
          {activeTab === 'profile' && (
            <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Avatar Section：訪客顯示灰白頭像，登入者可上傳 */}
              <div className="flex flex-col items-center">
                <div 
                  id="tour-profile-avatar" 
                  className={`relative group ${isLoggedIn ? 'cursor-pointer' : ''}`}
                  onClick={() => isLoggedIn && !avatarUploading && fileInputRef.current?.click()}
                >
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-xl overflow-hidden">
                    {avatarUploading ? (
                      <div className="w-full h-full rounded-full bg-[var(--bg-main)] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      </div>
                    ) : avatarUrl ? (
                      <img 
                        src={avatarUrl || auth.currentUser?.photoURL || ''} 
                        alt="Profile" 
                        className="w-full h-full rounded-full object-cover border-4 border-[var(--bg-main)]"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-600 border-4 border-[var(--bg-main)] flex items-center justify-center">
                        {DEFAULT_AVATAR_SVG}
                      </div>
                    )}
                  </div>
                  {isLoggedIn && !avatarUploading && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={24} />
                      </div>
                      <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-[var(--bg-main)]">
                        <Camera size={14} />
                      </div>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }} />
                {isLoggedIn && <p className="mt-3 text-xs text-[var(--text-secondary)] font-medium">點擊更換大頭貼</p>}
              </div>

              {/* 精簡版基本資料：Display Name、Email、PhotoURL */}
              <div className="space-y-5 bg-[var(--bg-card)] p-6 rounded-2xl shadow-sm border border-[var(--border-color)] transition-colors">
                <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider mb-4">基本資料</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] transition-colors">
                    <User size={18} className="text-[var(--text-secondary)]" />
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">顯示名稱</p>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{displayName || '尚未設定'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] transition-colors">
                    <Mail size={18} className="text-[var(--text-secondary)]" />
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">電子信箱</p>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{displayEmail || '尚未設定'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Activity Tab --- */}
          {activeTab === 'activity' && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              {isLoadingSubView ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                  <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-[var(--text-secondary)] font-bold animate-pulse">載入中...</p>
                </div>
              ) : activitySubView === 'main' ? (
                <div className="p-6 space-y-6">
                  {/* Stats Header：真實 Firestore users/{uid}.stats */}
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/30">
                        🏆
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">
                          {progressLoading ? '載入中...' : `Level ${Math.min(5, Math.floor((userProgress?.stats?.gradedPapers ?? 0) / 50) + 1)}`}
                        </h3>
                        <p className="text-indigo-200 text-sm font-medium">ASEA 學習達人</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <div className="text-xs text-indigo-200 mb-1">總批改次數</div>
                        <div className="text-xl font-bold">{progressLoading ? '—' : (userProgress?.stats?.gradedPapers ?? 0)}</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <div className="text-xs text-indigo-200 mb-1">連續登入</div>
                        <div className="text-xl font-bold">{progressLoading ? '—' : `${userProgress?.stats?.activeDays ?? 0} 天`}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu List */}
                  <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors">
                    <div id="tour-activity-history">
                      <ListItem 
                        icon={Heart} 
                        title="我的收藏 / 歷史紀錄" 
                        subtitle="查看您收藏的題目與批改歷史" 
                        color="text-rose-500" 
                        onClick={() => handleActivitySubViewChange('favorites-history')}
                      />
                    </div>
                    <div id="tour-activity-progress">
                      <ListItem 
                        icon={Clock} 
                        title="我的訂單 / 學習進度" 
                        subtitle="追蹤您的訂閱狀態與學習歷程" 
                        color="text-blue-500" 
                        onClick={() => handleActivitySubViewChange('orders-progress')}
                      />
                    </div>
                    <ListItem 
                      icon={CreditCard} 
                      title="錢包與支付管理" 
                      subtitle="管理您的付款方式與餘額" 
                      color="text-emerald-500" 
                      onClick={() => handleActivitySubViewChange('wallet')}
                    />
                    <div id="tour-activity-subscription">
                      <ListItem 
                        icon={Zap} 
                        title="訂閱方案 / 會員中心" 
                        subtitle="升級 Pro 解鎖更多功能" 
                        color="text-amber-500" 
                        className="bg-gradient-to-r from-amber-50/50 to-purple-50/50 dark:from-amber-900/10 dark:to-purple-900/10 border-l-4 border-amber-500"
                        titleClassName="text-amber-600 dark:text-amber-400 font-black"
                        onClick={() => { onClose(); setShowPaywall(true); }}
                      />
                    </div>
                    <ListItem 
                      icon={Share2} 
                      title="邀請好友 / 推薦碼" 
                      subtitle="分享 App 並獲得獎勵" 
                      color="text-indigo-500" 
                      isLast 
                      onClick={() => handleActivitySubViewChange('referral')}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Sub View Header */}
                  <div className="flex items-center gap-3 p-4 border-b border-[var(--border-color)] transition-colors">
                    <button 
                      onClick={() => setActivitySubView('main')}
                      className="p-2 hover:bg-[var(--bg-card)] rounded-full transition-colors"
                    >
                      <ArrowLeft size={20} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
                    </button>
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">
                      {activitySubView === 'favorites-history' && '我的收藏與紀錄'}
                      {activitySubView === 'orders-progress' && '訂單與學習進度'}
                      {activitySubView === 'wallet' && '錢包管理'}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {activitySubView === 'favorites-history' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] transition-colors">
                          <button 
                            onClick={() => setActiveFavTab('fav')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeFavTab === 'fav' ? 'bg-[var(--bg-main)] shadow-sm text-blue-600 border border-[var(--border-color)]' : 'text-[var(--text-secondary)]'}`}
                          >
                            收藏題目
                          </button>
                          <button 
                            onClick={() => setActiveFavTab('hist')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeFavTab === 'hist' ? 'bg-[var(--bg-main)] shadow-sm text-blue-600 border border-[var(--border-color)]' : 'text-[var(--text-secondary)]'}`}
                          >
                            批改歷史
                          </button>
                        </div>

                        {activeFavTab === 'fav' ? (
                          <div key="fav" className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            {favorites.map((item) => (
                              <div 
                                key={item.id} 
                                className="group p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer"
                                onClick={() => onViewHistory && onViewHistory(item.data, item.subject)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md uppercase tracking-wider mr-2">
                                      {item.subject}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-secondary)] font-bold">{item.date}</span>
                                  </div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('確定要取消收藏此題嗎？')) toggleFavorite(item);
                                    }}
                                    className="p-1.5 text-amber-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                  {item.snippet}
                                </p>
                              </div>
                            ))}
                            {favorites.length === 0 && (
                              <div className="text-center py-12 opacity-50 flex flex-col items-center">
                                <Star size={40} className="text-[var(--text-secondary)] mb-3" />
                                <p className="text-sm font-bold text-[var(--text-secondary)]">您還沒有收藏任何題目</p>
                                <p className="text-xs mt-1">在批改結果頁點擊右上角的星星即可加入收藏</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div key="hist" className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* 🚀 替換為真實資料的迴圈與點擊事件 */}
                            {activities.filter(a => a.type === 'grading').map((item: any) => (
                              <div 
                                key={item.id} 
                                // 🚀 新增點擊事件：呼叫 onViewHistory 並傳入當初批改的 data
                                onClick={() => {
                                  if (item.data && onViewHistory) {
                                    onViewHistory(item.data, item.title);
                                    onClose(); // 點開後自動關閉抽屜
                                  }
                                }}
                                className="group p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md uppercase tracking-wider mr-2">
                                      AI 批改紀錄
                                    </span>
                                    <span className="text-[10px] text-[var(--text-secondary)] font-bold">
                                      {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
                                  {item.title}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            ))}
                            {activities.filter(a => a.type === 'grading').length === 0 && (
                              <div className="text-center py-12 opacity-50">
                                <p className="text-sm font-bold text-[var(--text-secondary)]">尚無批改紀錄</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activitySubView === 'orders-progress' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm transition-colors">
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <h4 className="text-lg font-black text-[var(--text-primary)]">學習進度</h4>
                              <p className="text-xs text-[var(--text-secondary)]">本週批改次數</p>
                            </div>
                            <span className="text-2xl font-black text-blue-600">
                              {progressLoading ? '—' : (userProgress?.stats?.gradedPapers ?? 0)}
                              <span className="text-sm text-[var(--text-secondary)]"> 次</span>
                            </span>
                          </div>
                          <div className="h-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full overflow-hidden transition-colors">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, ((userProgress?.stats?.gradedPapers ?? 0) % 20) * 5)}%` }}
                            />
                          </div>
                          <p className="mt-4 text-[10px] text-[var(--text-secondary)] font-bold text-center uppercase tracking-widest">
                            持續批改以累積學習紀錄
                          </p>
                        </div>
                        <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                          訂單紀錄需串接金流 API，敬請期待。
                        </div>
                      </div>
                    )}

                    {activitySubView === 'wallet' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
                          錢包與支付管理需串接金流 API，敬請期待。
                        </div>
                      </div>
                    )}

                    {activitySubView === 'referral' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white text-center relative overflow-hidden">
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-xl border border-white/30">
                              🎁
                            </div>
                            <h4 className="text-2xl font-black mb-2">邀請好友，共享獎勵</h4>
                            <p className="text-blue-100 text-sm mb-8">推薦碼功能即將推出，敬請期待。</p>
                            <button 
                              onClick={handleShare}
                              className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                            >
                              <Share2 size={20} />
                              分享 ASEA
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- Settings Tab --- */}
          {activeTab === 'settings' && (
            <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* System Preferences */}
              <div id="tour-settings-preferences" className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors">
                <div className="p-4 bg-[var(--bg-main)] border-b border-[var(--border-color)] transition-colors">
                  <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">系統偏好</h3>
                </div>
                <div className="p-2">
                  <ToggleItem 
                    icon={Moon} 
                    title="深色模式" 
                    checked={theme === 'dark'} 
                    onChange={toggleTheme} 
                  />
                  <ToggleItem 
                    icon={Bell} 
                    title="推播通知" 
                    checked={settings.notifications} 
                    onChange={v => setSettings({...settings, notifications: v})} 
                  />
                  <ToggleItem 
                    icon={Eye} 
                    title="隱私模式" 
                    description="隱藏敏感資訊與個人數據"
                    checked={settings.isPrivateProfile} 
                    onChange={handlePrivacyModeChange}
                    disabled={settingsLoading}
                    loading={settingsLoading}
                  />
                </div>
              </div>

              {/* Account & Security */}
              <div id="tour-settings-account" className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors">
                <div className="p-4 bg-[var(--bg-main)] border-b border-[var(--border-color)] transition-colors">
                  <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">帳號與安全</h3>
                </div>
                <div className="p-2">
                  <ActionItem icon={Lock} title="修改密碼" onClick={handlePasswordReset} />

                  <ActionItem 
                    icon={RefreshCw} 
                    title="清除快取" 
                    onClick={() => setModalType('clearCache')} 
                  />
                </div>
              </div>

              {/* Danger Zone */}
              <div id="tour-settings-danger" className="bg-red-50 dark:bg-red-900/10 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden transition-colors">
                <div className="p-4 bg-red-100/50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 transition-colors">
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-wider">危險區域</h3>
                </div>
                <div className="p-2">
                  <ActionItem 
                    icon={LogOut} 
                    title="登出" 
                    onClick={() => setModalType('logout')} 
                    textColor="text-red-600 dark:text-red-400"
                    iconColor="text-red-500"
                    bgColor="bg-red-100 dark:bg-red-900/30"
                  />
                  <ActionItem 
                    icon={Trash2} 
                    title="刪除帳號" 
                    description="此動作無法復原，請謹慎操作"
                    onClick={() => setModalType('deleteAccount')} 
                    textColor="text-red-600 dark:text-red-400"
                    iconColor="text-red-500"
                    bgColor="bg-red-100 dark:bg-red-900/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- Support Tab --- */}
          {activeTab === 'support' && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Support Main View */}
              {supportView === 'main' && (
                <div className="p-6 space-y-6">
                  {/* Hero Card */}
                  <div id="tour-support-hero" className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black mb-2">需要協助嗎？</h3>
                      <p className="text-blue-100 text-sm mb-6">我們的 AI 客服與專家團隊隨時為您服務。</p>
                      <button 
                        onClick={() => setSupportView('ai-chat')}
                        className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold shadow-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={18} />
                        開啟 AI 智慧客服
                      </button>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
                  </div>

                  {/* Menu Grid */}
                  <div id="tour-support-grid" className="grid grid-cols-2 gap-4">
                    <SupportCard 
                      icon={AlertTriangle} 
                      title="問題回報" 
                      color="text-amber-500" 
                      bg="bg-amber-50 dark:bg-amber-900/20"
                      onClick={() => setSupportView('issue')}
                    />
                    <SupportCard 
                      icon={History} 
                      title="回饋紀錄" 
                      color="text-purple-500" 
                      bg="bg-purple-50 dark:bg-purple-900/20"
                      onClick={() => setSupportView('history')}
                    />
                    <SupportCard 
                      icon={FileText} 
                      title="技術白皮書" 
                      color="text-emerald-500" 
                      bg="bg-emerald-50 dark:bg-emerald-900/20"
                      onClick={() => setSupportView('whitepaper')}
                    />
                    <SupportCard 
                      icon={Shield} 
                      title="隱私權政策" 
                      color="text-blue-500" 
                      bg="bg-blue-50 dark:bg-blue-900/20"
                      onClick={() => setSupportView('privacy')}
                    />
                    <SupportCard 
                      icon={LifeBuoy} 
                      title="聯絡專人" 
                      color="text-rose-500" 
                      bg="bg-rose-50 dark:bg-rose-900/20"
                      onClick={() => {
                        setSupportView('ai-chat');
                        setTimeout(handleTransferToHuman, 500);
                      }}
                    />
                  </div>

                  {/* FAQ Accordion */}
                  <div id="tour-support-faq" className="space-y-4">
                    <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider ml-1">常見問題</h3>
                    <div className="space-y-2">
                      <FAQItem title="什麼是 VLM 視覺語言模型？" content="VLM (Vision-Language Model) 是結合電腦視覺與自然語言處理的先進 AI 技術，能理解並分析圖像中的文字、圖表與情境。" />
                      <FAQItem title="CoT 思維鏈如何運作？" content="CoT (Chain of Thought) 是一種提示工程技術，引導 AI 展示推論過程，從而提升複雜邏輯問題的準確率。" />
                      <FAQItem title="ICE 評分標準是什麼？" content="ICE 代表 Ideas (觀點)、Connections (連結) 與 Extensions (延伸)，是我們用來評估學習深度的核心指標。" />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub Views Header */}
              {supportView !== 'main' && (
                <div className="flex items-center gap-3 p-4 border-b border-[var(--border-color)] transition-colors">
                  <button 
                    onClick={() => setSupportView('main')}
                    className="p-2 hover:bg-[var(--bg-card)] rounded-full transition-colors"
                  >
                    <ArrowLeft size={20} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
                  </button>
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">
                    {supportView === 'ai-chat' && 'AI 智慧客服'}
                    {supportView === 'issue' && '問題回報'}
                    {supportView === 'history' && '回饋紀錄'}
                    {supportView === 'whitepaper' && '技術白皮書'}
                    {supportView === 'privacy' && '隱私權政策'}
                  </h3>
                </div>
              )}

              {/* AI Chat View */}
              {supportView === 'ai-chat' && (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-card)] transition-colors">
                    {supportMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-[var(--bg-main)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)] rounded-tl-none transition-colors'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {supportTyping && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] p-3 rounded-2xl rounded-tl-none bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] transition-colors">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="輸入訊息..."
                        className="flex-1 p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={supportTyping || !chatInput.trim()}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                      <button 
                        onClick={handleTransferToHuman}
                        className="w-full mt-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest transition-colors"
                      >
                        轉接真人客服
                      </button>
                  </div>
                </div>
              )}

              {/* Issue Report View */}
              {supportView === 'issue' && (
                <div className="p-6 space-y-6">
                  {!showCSAT ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[var(--text-primary)]">問題類型</label>
                        <select 
                          value={issueType}
                          onChange={e => setIssueType(e.target.value)}
                          className="w-full p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] outline-none focus:border-blue-500 text-[var(--text-primary)] transition-colors"
                        >
                          <option value="vlm-error">影像辨識錯誤 (VLM Error)</option>
                          <option value="cot-logic">學理邏輯質疑 (CoT Logic)</option>
                          <option value="ui-ux">介面操作問題 (UI/UX)</option>
                          <option value="other">其他建議 (Other)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[var(--text-primary)]">問題描述</label>
                        <textarea 
                          value={issueDesc}
                          onChange={e => setIssueDesc(e.target.value)}
                          className="w-full h-48 p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] outline-none focus:border-blue-500 resize-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors"
                          placeholder="請詳細描述您遇到的狀況..."
                        />
                      </div>
                      <button 
                        onClick={handleSubmitIssue}
                        disabled={!issueDesc.trim() || issueSubmitting}
                        className="w-full py-4 bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        {issueSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> 提交中...</> : '提交回報'}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-6 border border-green-200 dark:border-green-800">
                        <CheckCircle size={40} />
                      </div>
                      <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2">感謝您的回報！</h3>
                      <p className="text-[var(--text-secondary)] text-center mb-8 max-w-xs">我們已收到您的訊息，將盡快由專人為您處理。</p>
                      
                      <div className="bg-[var(--bg-card)] p-6 rounded-2xl w-full border border-[var(--border-color)] transition-colors">
                        <p className="text-center font-bold text-[var(--text-primary)] mb-4">您對本次服務滿意嗎？</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                          <button 
                            onClick={() => handleCSAT('滿意')}
                            className="flex-1 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-2 hover:border-green-500 hover:text-green-600 text-[var(--text-primary)] transition-all"
                          >
                            <ThumbsUp size={20} /> 滿意
                          </button>
                          <button 
                            onClick={() => handleCSAT('不滿意')}
                            className="flex-1 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-2 hover:border-red-500 hover:text-red-600 text-[var(--text-primary)] transition-all"
                          >
                            <ThumbsDown size={20} /> 不滿意
                          </button>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => { setShowCSAT(false); setSupportView('main'); }}
                        className="mt-8 text-[var(--text-secondary)] font-bold text-sm hover:text-[var(--text-primary)] transition-colors"
                      >
                        返回主選單
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* History View */}
              {supportView === 'history' && (
                <div className="p-6">
                  <div className="text-center py-20 opacity-50">
                    <History size={48} className="mx-auto mb-4 text-[var(--text-secondary)]" />
                    <p className="font-bold text-[var(--text-secondary)]">暫無歷史紀錄</p>
                  </div>
                </div>
              )}

              {/* Whitepaper View */}
              {supportView === 'whitepaper' && (
                <div className="p-6">
                  <AseaWhitepaper />
                </div>
              )}

              {/* Privacy Policy View */}
              {supportView === 'privacy' && (
                <div className="p-6">
                  <PrivacyPolicyView />
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] text-center transition-colors">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">ASEA</p>
        </div>

      </div>

      {/* --- Unified Confirm Modal --- */}
      {modalType && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-[var(--border-color)] transition-colors">
            {modalType === 'addCard' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-primary)]">新增付款方式</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">卡號</label>
                    <input type="text" placeholder="**** **** **** ****" className="w-full p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:border-blue-500 text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">到期日</label>
                      <input type="text" placeholder="MM/YY" className="w-full p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:border-blue-500 text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">CVC</label>
                      <input type="text" placeholder="***" className="w-full p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:border-blue-500 text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModalType(null)} className="flex-1 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold rounded-xl transition-colors">取消</button>
                  <button onClick={handleConfirmAction} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">儲存卡片</button>
                </div>
              </div>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${
                  modalType === 'deleteAccount' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800'
                }`}>
                  {modalType === 'deleteAccount' ? <AlertCircle size={24} /> : <AlertTriangle size={24} />}
                </div>
                
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  {modalType === 'logout' && '確定要登出嗎？'}
                  {modalType === 'clearCache' && '清除快取資料？'}
                  {modalType === 'deleteAccount' && '刪除帳號警告'}
                </h3>
                
                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                  {modalType === 'logout' && '您將需要重新登入才能存取您的資料。'}
                  {modalType === 'clearCache' && '這將釋放裝置空間，但下次載入可能會稍慢。'}
                  {modalType === 'deleteAccount' && '此動作將永久刪除您的所有數據且無法復原。請輸入 "DELETE" 以確認。'}
                </p>

                {modalType === 'deleteAccount' && (
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder='輸入 DELETE 確認'
                    className="w-full p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:border-red-500 text-sm text-[var(--text-primary)] transition-colors mb-4"
                  />
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setModalType(null); setDeleteConfirmText(''); }}
                    className="flex-1 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold rounded-xl hover:bg-[var(--bg-card)] transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleConfirmAction}
                    disabled={modalType === 'deleteAccount' && deleteConfirmText !== 'DELETE'}
                    className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      modalType === 'deleteAccount' ? 'bg-red-600 hover:bg-red-700' : 'bg-[var(--text-primary)] text-[var(--bg-main)] hover:opacity-90'
                    }`}
                  >
                    確認
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub Components ---

const TabButton = ({ id, active, onClick, icon: Icon, label }: { id?: string, active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    id={id}
    onClick={onClick}
    className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative ${
      active ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    {active && <div className="absolute bottom-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full animate-in zoom-in-x duration-300" />}
  </button>
);

const InputGroup = ({ label, value, onChange, icon: Icon, type = "text", prefix }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">{label}</label>
    <div className="relative group">
      <div className="absolute left-3 top-3.5 text-[var(--text-secondary)] group-focus-within:text-blue-500 transition-colors">
        <Icon size={18} />
      </div>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full p-3 ${prefix ? 'pl-16' : 'pl-10'} rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] outline-none focus:border-blue-500 text-sm transition-all text-[var(--text-primary)] placeholder-[var(--text-secondary)]`}
      />
      {prefix && <span className="absolute left-10 top-3.5 text-[var(--text-secondary)] text-sm font-medium">{prefix}</span>}
    </div>
  </div>
);

const ListItem = ({ icon: Icon, title, subtitle, color, isLast, onClick, className = "", titleClassName = "" }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-main)] transition-colors text-left ${!isLast && 'border-b border-[var(--border-color)]'} ${className}`}
  >
    <div className={`w-10 h-10 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center transition-colors ${color}`}>
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <h4 className={`font-bold text-[var(--text-primary)] text-sm ${titleClassName}`}>{title}</h4>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
    </div>
    <ChevronRight size={18} className="text-[var(--text-secondary)]" />
  </button>
);

const ToggleItem = ({ icon: Icon, title, description, checked, onChange, disabled, loading }: any) => (
  <div className={`flex items-center justify-between p-4 rounded-xl transition-colors ${!disabled ? 'hover:bg-[var(--bg-main)]' : 'opacity-70'}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors">
        <Icon size={20} />
      </div>
      <div>
        <h4 className="font-medium text-[var(--text-primary)] text-sm">{title}</h4>
        {description && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{description}</p>}
      </div>
    </div>
    <button 
      onClick={() => !disabled && !loading && onChange(!checked)}
      disabled={disabled}
      className={`w-11 h-6 rounded-full transition-colors relative overflow-hidden flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600' : 'bg-[var(--border-color)]'} ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      {loading ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />}
    </button>
  </div>
);

const ActionItem = ({ icon: Icon, title, description, onClick, textColor = "text-[var(--text-primary)]", iconColor = "text-[var(--text-secondary)]", bgColor = "bg-[var(--bg-main)] border border-[var(--border-color)]" }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-main)] rounded-xl transition-colors text-left group"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg transition-colors ${bgColor} ${iconColor}`}>
        <Icon size={20} />
      </div>
      <div>
        <h4 className={`font-medium text-sm ${textColor}`}>{title}</h4>
        {description && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 group-hover:text-red-500 transition-colors">{description}</p>}
      </div>
    </div>
    <ChevronRight size={18} className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
  </button>
);

const SupportCard = ({ icon: Icon, title, color, bg, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-2xl ${bg} hover:opacity-80 transition-opacity gap-3 border border-[var(--border-color)]`}
  >
    <div className={`${color}`}>
      <Icon size={28} />
    </div>
    <span className={`text-xs font-bold ${color}`}>{title}</span>
  </button>
);

const FAQItem = ({ title, content }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)] transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-main)] transition-colors"
      >
        <span className="font-bold text-sm text-[var(--text-primary)]">{title}</span>
        <ChevronRight size={16} className={`text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-main)]/50 transition-colors">
          {content}
        </div>
      )}
    </div>
  );
};