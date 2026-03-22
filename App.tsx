import React, { useState } from 'react';
import { Header } from './components/Header';
import { SubjectSelector } from './components/SubjectSelector';
import { GradingWorkflow } from './components/GradingWorkflow';
import { SettingsModal } from './components/SettingsModal';
import EnterpriseUserDrawer from './components/EnterpriseUserDrawer';
import { AseaSplashScreen } from './components/AseaSplashScreen';

import { AppProvider, useAppContext } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthModal } from './components/BusinessModals';
import { OnboardingModal } from './components/OnboardingModal';
import { useOnboardingTour, TooltipOnboarding } from './hooks/useOnboardingTour';
import { subjectOnboardingData } from './utils/onboardingContent';
import { HistoryViewerModal } from './components/HistoryViewerModal';

// New Modules
import { AuthOverlayModal } from './components/AuthOverlayModal';
import { SmartPaywallModal } from './components/monetization/SmartPaywallModal';

function AppContent() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [userDrawerInitialTab, setUserDrawerInitialTab] = useState<'profile' | 'support' | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  // 🚀 新增：控制歷史紀錄檢視器的狀態
  const [viewingHistoryResult, setViewingHistoryResult] = useState<any>(null);
  const [historyModalTitle, setHistoryModalTitle] = useState('');
  
  const { currentStep, nextStep, endTour } = useOnboardingTour('main_dashboard');
  const TOTAL_STEPS = 3;
  
  const getSubjectKey = (id: string) => {
    if (id.includes('chinese') || id.includes('english')) return 'chinese';
    if (id.includes('math')) return 'math';
    if (id.includes('chemistry')) return 'chemistry';
    if (id.includes('physics')) return 'physics';
    if (id.includes('biology') || id.includes('science')) return 'biology';
    return 'default';
  };

  const tooltipData = selectedSubject 
    ? (subjectOnboardingData[getSubjectKey(selectedSubject)] || subjectOnboardingData.default)
    : subjectOnboardingData.default;
  
  // New Modal States (can be controlled by events or context in a real app)
  // Hook into AppContext to control SmartPaywallModal if we want to replace the old one
  const { 
    showPaywall, setShowPaywall, upgradeToPro,
    activities, customInstructions, setCustomInstructions, clearHistory, theme, toggleTheme,
    authReady, setActiveSubject
  } = useAppContext();

  React.useEffect(() => {
    setActiveSubject(selectedSubject);
  }, [selectedSubject, setActiveSubject]);

  React.useEffect(() => {
    const handleOpenSupport = () => { setUserDrawerInitialTab('support'); setIsUserDrawerOpen(true); };
    window.addEventListener('open-support-desk', handleOpenSupport);
    return () => window.removeEventListener('open-support-desk', handleOpenSupport);
  }, []);

  // Auth 初始化中：顯示載入畫面，避免驗證/登入重導向後白屏
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 flex flex-col">
      {showSplash && <AseaSplashScreen onComplete={() => setShowSplash(false)} />}
      
      <TooltipOnboarding
        step={1}
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        title="管理您的設定"
        content="點擊這裡可以隨時查看您的學習歷程、設定 AI 偏好與管理訂閱狀態。"
        position="bottom"
        onNext={nextStep}
        onEnd={endTour}
      >
        <Header 
          onOpenUserDrawer={() => { setUserDrawerInitialTab(null); setIsUserDrawerOpen(true); }}
          theme={theme}
        />
      </TooltipOnboarding>
      
      {!selectedSubject ? (
        <TooltipOnboarding
          step={2}
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          title="選擇測驗科目"
          content="ASEA 支援國寫、數理化等多種學科。選一個您想批改的科目開始吧！"
          position="top"
          onNext={nextStep}
          onEnd={endTour}
        >
          <SubjectSelector onSelect={(sub) => setSelectedSubject(sub.id)} />
        </TooltipOnboarding>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <button
            onClick={() => {
              setSelectedSubject('');
              if (currentStep === 3) endTour();
            }}
            className="mb-6 flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] px-4 py-2 rounded-lg shadow-sm border border-[var(--border-color)] transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回選擇科目
          </button>
          
          <TooltipOnboarding
            step={3}
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            title={tooltipData.title}
            content={tooltipData.content}
            position="top"
            onNext={endTour}
            onEnd={endTour}
          >
            <div className="w-full">
              <GradingWorkflow subject={selectedSubject} />
            </div>
          </TooltipOnboarding>
        </main>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        activities={activities}
        customInstructions={customInstructions}
        onSaveInstructions={setCustomInstructions}
        onClearHistory={clearHistory}
        onViewHistoryItem={(item) => {
          if (item.data) {
            setViewingHistoryResult(item.data);
            setHistoryModalTitle(item.title);
            setIsSettingsOpen(false); // 關閉原本的設定視窗
          } else {
            alert('無法載入此紀錄的詳細資料，可能為舊版格式或無暫存資料。');
          }
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <EnterpriseUserDrawer 
        isOpen={isUserDrawerOpen} 
        onClose={() => { setIsUserDrawerOpen(false); setUserDrawerInitialTab(null); }} 
        initialTab={userDrawerInitialTab}
        onViewHistory={(data, title) => {
          console.log("成功點擊歷史紀錄！資料為：", data);
          setViewingHistoryResult(data);
          setHistoryModalTitle(title);
        }}
      />

      {/* 🚀 新增的歷史紀錄檢視器 Modal */}
      <HistoryViewerModal
        isOpen={!!viewingHistoryResult}
        onClose={() => setViewingHistoryResult(null)}
        resultData={viewingHistoryResult}
        title={historyModalTitle}
      />

      {/* Legacy Business Modals */}
      <AuthModal />
      {/* Replaced PaywallModal with SmartPaywallModal controlled by the same context state */}
      <SmartPaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        onSubscribe={upgradeToPro} 
      />
      <OnboardingModal />

      {/* New Modules */}
      <AuthOverlayModal />
      
      <button 
        onClick={() => { setUserDrawerInitialTab('support'); setIsUserDrawerOpen(true); }}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all z-50"
        title="聯絡客服"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      </button>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
