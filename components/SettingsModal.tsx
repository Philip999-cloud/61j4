import React, { useState, useEffect } from 'react';
import { ActivityEntry } from '../types';
import AseaWhitepaper from './common/AseaWhitepaper';
import PrivacyPolicyView from './common/PrivacyPolicyView';
import { ProfileProgressWidget, NotificationSettingsGroup, SmartPaywallMockup, DynamicFAQView } from './settings/AdvancedSettingsModules';
import { Settings, User, Bell, CreditCard, HelpCircle, LogOut, ChevronRight, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityEntry[];
  customInstructions: string;
  onSaveInstructions: (val: string) => void;
  onClearHistory: () => void;
  onViewHistoryItem: (item: ActivityEntry) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type ViewState = 'menu' | 'history' | 'instructions' | 'help' | 'feedback' | 'whitepaper' | 'privacy';
type TabState = 'core' | 'profile' | 'prefs' | 'plan' | 'support';

const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '剛才';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  return `${days} 天前`;
};

const SettingsItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  theme: 'light' | 'dark';
  isToggle?: boolean;
  isToggled?: boolean;
}> = ({ icon, title, description, onClick, theme, isToggle, isToggled }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-6 transition-colors group text-left border-b last:border-0 rounded-xl ${theme === 'dark' ? 'hover:bg-zinc-900 border-zinc-900' : 'hover:bg-slate-50 border-slate-100'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`transition-colors ${theme === 'dark' ? 'text-zinc-400 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'}`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-bold text-base leading-none mb-1 ${theme === 'dark' ? 'text-zinc-100' : 'text-slate-800'}`}>{title}</h3>
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>{description}</p>
      </div>
    </div>
    <div className={`transition-colors ${theme === 'dark' ? 'text-zinc-700 group-hover:text-zinc-500' : 'text-slate-300 group-hover:text-slate-400'}`}>
      {isToggle ? (
        <input 
          type="checkbox" 
          checked={isToggled} 
          readOnly 
          className="theme-toggle-switch" 
        />
      ) : (
        <ChevronRight size={20} />
      )}
    </div>
  </button>
);

const ActivityIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'theme':
      return (
        <div className="p-2 bg-purple-500/20 text-purple-500 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
        </div>
      );
    case 'subject':
      return (
        <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
      );
    case 'grading':
      return (
        <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      );
    case 'settings':
      return (
        <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </div>
      );
    default:
      return (
        <div className="p-2 bg-zinc-500/20 text-zinc-500 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      );
  }
};

export const SettingsModal: React.FC<Props> = ({ 
  isOpen, onClose, activities, customInstructions, onSaveInstructions, onClearHistory, onViewHistoryItem, theme, onToggleTheme
}) => {
  const [view, setView] = useState<ViewState>('menu');
  const [tempInstructions, setTempInstructions] = useState(customInstructions);
  const [activeTab, setActiveTab] = useState<TabState>('core');

  useEffect(() => {
    if (isOpen) {
      setView('menu');
      setTempInstructions(customInstructions);
      setActiveTab('core');
    }
  }, [isOpen, customInstructions]);

  if (!isOpen) return null;

  const handleBack = () => setView('menu');

  const openKeyPicker = async () => {
    if (typeof (window as any).aistudio?.openSelectKey === 'function') {
      await (window as any).aistudio.openSelectKey();
    } else {
      alert('Key picker is only available in AI Studio.');
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: TabState, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        activeTab === id 
          ? (theme === 'dark' ? 'bg-zinc-800 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-md')
          : (theme === 'dark' ? 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')
      }`}
    >
      <Icon size={20} className={`transition-colors ${activeTab === id ? (theme === 'dark' ? 'text-blue-400' : 'text-indigo-500') : ''}`} />
      <span className="font-bold text-sm tracking-wide">{label}</span>
      {activeTab === id && (
        <div className={`ml-auto w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#444' : '#cbd5e1'}; border-radius: 10px; }
      `}} />

      <div className={`relative w-full max-w-5xl h-full max-h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 flex flex-col md:flex-row border ${theme === 'dark' ? 'bg-[#202124] border-zinc-900' : 'bg-white border-white'}`}>
        
        {/* Bulletproof Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
          aria-label="關閉視窗"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Sidebar Navigation */}
        <div className={`w-full md:w-64 p-4 md:p-6 flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r overflow-x-auto shrink-0 ${theme === 'dark' ? 'bg-[#202124] border-zinc-900' : 'bg-slate-100/50 border-slate-200'}`}>
          <div className="mb-2 md:mb-6 px-2">
            <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-zinc-600' : 'text-slate-400'}`}>Settings</h2>
          </div>
          
          <TabButton id="core" label="系統核心" icon={Settings} />
          <TabButton id="profile" label="個人檔案" icon={User} />
          <TabButton id="prefs" label="偏好設定" icon={Bell} />
          <TabButton id="plan" label="訂閱方案" icon={CreditCard} />
          <TabButton id="support" label="客服支援" icon={HelpCircle} />

          <div className="mt-auto pt-6 border-t border-dashed border-slate-200/20 hidden md:block">
             <button onClick={onClose} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${theme === 'dark' ? 'text-zinc-500 hover:bg-zinc-900 hover:text-red-400' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}>
               <LogOut size={20} />
               <span className="font-bold text-sm">關閉設定</span>
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${theme === 'dark' ? 'bg-[#202124]' : 'bg-white'}`}>
          
          {/* Core Tab Content (Original Logic) */}
          {activeTab === 'core' && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-8 pb-4 shrink-0">
                {view !== 'menu' && (
                  <button onClick={handleBack} className={`flex items-center gap-2 transition-colors mb-4 group ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="font-bold text-sm uppercase tracking-wider">返回</span>
                  </button>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`pr-8 text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {view === 'menu' && '系統核心設定'}
                      {view === 'history' && '活動紀錄'}
                      {view === 'instructions' && 'AI 指令偏好'}
                      {view === 'help' && '系統說明'}
                      {view === 'whitepaper' && '技術白皮書'}
                      {view === 'privacy' && '隱私權政策'}
                    </h2>
                    <p className={`font-medium mt-1 text-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>
                      {view === 'history' ? '查看您最近的批改與環境設定軌跡' : view === 'whitepaper' ? '了解 ASEA 的核心架構與設計理念' : view === 'privacy' ? '了解我們如何保護您的資料安全' : '管理您的核心評估參數與環境變數'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                {view === 'menu' && (
                  <div className="space-y-3 pb-10">
                    <SettingsItem theme={theme} title="活動紀錄" description="檢視歷史批改、主題切換與操作軌跡" onClick={() => setView('history')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <SettingsItem theme={theme} title="給 App 的指令" description="定義 AI 的批改權重與語氣偏好" onClick={() => setView('instructions')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>} />
                    <SettingsItem 
                      theme={theme} 
                      title="深色模式" 
                      description={theme === 'dark' ? '已啟用深色外觀' : '已啟用淺色外觀'} 
                      onClick={onToggleTheme} 
                      icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                      isToggle={true}
                      isToggled={theme === 'dark'}
                    />
                    <SettingsItem theme={theme} title="技術白皮書" description="閱讀 ASEA 核心架構白皮書" onClick={() => setView('whitepaper')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
                    <SettingsItem theme={theme} title="隱私權政策" description="查看 ASEA 隱私權政策與資料保護條款" onClick={() => setView('privacy')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} />
                    <SettingsItem theme={theme} title="API 金鑰設定" description="管理您的 AI Studio 存取權限" onClick={openKeyPicker} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>} />
                  </div>
                )}

                {view === 'history' && (
                  <div className="space-y-4 pb-10">
                    {activities.length === 0 ? (
                      <div className="text-center py-24 opacity-20"><p className="font-black uppercase tracking-[0.8em] text-lg">Empty Log</p></div>
                    ) : (
                      <>
                        <div className="flex justify-end">
                           <button onClick={onClearHistory} className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 hover:opacity-70 transition-opacity flex items-center gap-2">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2.5} /></svg>清除記錄
                           </button>
                        </div>
                        <div className="space-y-3">
                          {activities.map(entry => (
                            <div key={entry.id} onClick={() => { if(entry.type === 'grading') { onViewHistoryItem(entry); onClose(); } }} className={`w-full text-left p-5 rounded-2xl border flex items-center gap-4 group transition-all ${entry.type === 'grading' ? 'cursor-pointer active:scale-[0.98]' : ''} ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200'}`}>
                              <ActivityIcon type={entry.type} />
                              <div className="flex-grow min-w-0">
                                <h3 className={`font-bold text-base truncate transition-colors ${theme === 'dark' ? 'text-zinc-100' : 'text-slate-800'}`}>{entry.title}</h3>
                                <p className="text-zinc-500 text-sm truncate">{entry.description}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 text-zinc-500 whitespace-nowrap font-bold text-[10px]">
                                <span className="opacity-40">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span className={`px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-900' : 'bg-slate-200/50'}`}>{formatRelativeTime(entry.timestamp)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {view === 'instructions' && (
                  <div className="space-y-6 pb-10">
                    <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-blue-900/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                      <p className={`text-base leading-relaxed font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>定義批改偏好 (例如：嚴格、著重創意、或是更關注文法)。</p>
                    </div>
                    <textarea value={tempInstructions} onChange={(e) => setTempInstructions(e.target.value)} placeholder="在此輸入偏好指令..." className={`w-full h-48 md:h-64 p-6 border-2 rounded-3xl outline-none resize-none text-lg leading-relaxed transition-all shadow-inner ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-blue-500' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-blue-500'}`} />
                    <button onClick={() => { onSaveInstructions(tempInstructions); handleBack(); }} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-xl transition-all active:scale-95">儲存偏好</button>
                  </div>
                )}

                {view === 'whitepaper' && (
                  <div className="pb-10">
                    <div className={`rounded-2xl p-6 md:p-8 shadow-inner ${theme === 'dark' ? 'bg-white' : 'bg-white'}`}>
                      <AseaWhitepaper />
                    </div>
                  </div>
                )}

                {view === 'privacy' && (
                  <div className="pb-10">
                    <div className={`rounded-2xl p-6 md:p-8 shadow-inner ${theme === 'dark' ? 'bg-[#2a2b2e]' : 'bg-white'}`}>
                      <PrivacyPolicyView />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Modules Content */}
          {activeTab !== 'core' && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-4 shrink-0">
                <h2 className={`pr-8 text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {activeTab === 'profile' && '個人檔案'}
                  {activeTab === 'prefs' && '偏好設定'}
                  {activeTab === 'plan' && '訂閱方案'}
                  {activeTab === 'support' && '客服支援'}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                {activeTab === 'profile' && <ProfileProgressWidget />}
                {activeTab === 'prefs' && <NotificationSettingsGroup />}
                {activeTab === 'plan' && <SmartPaywallMockup />}
                {activeTab === 'support' && <DynamicFAQView />}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};


