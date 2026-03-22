import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Mail, RotateCcw } from 'lucide-react';
import { useSupportInteractions } from '../../hooks/useSupportInteractions';
import { useAppContext } from '../../contexts/AppContext';

/** 上下文感知：useSupportInteractions 會透過 useAppContext(activeSubject) 與 window.location.pathname 注入隱藏上下文至 API Payload，UI 不渲染。 */
import { useToast } from '../../contexts/ToastContext';
import { sendTranscriptToAdmin } from '../../services/contactSupportService';

export const FloatingAIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [sendingTranscript, setSendingTranscript] = useState(false);
  const { messages, isTyping, sendMessage, retryFailedMessage } = useSupportInteractions();
  const { user } = useAppContext();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatTranscript = () =>
    messages
      .map((m) => `${m.role === 'user' ? '用戶' : 'AI 客服'}: ${m.content}`)
      .join('\n\n');

  const handleExportClick = () => {
    setShowConsent(true);
    setConsentChecked(false);
  };

  const handleConfirmSend = async () => {
    if (!consentChecked) return;
    if (!user?.email || !user?.uid) {
      toast.error('請先登入後再傳送對話紀錄。');
      return;
    }
    setSendingTranscript(true);
    try {
      const ok = await sendTranscriptToAdmin(formatTranscript(), user.email, user.uid);
      if (ok) {
        toast.success('對話紀錄已成功傳送給客服團隊！');
        setShowConsent(false);
      } else {
        toast.error('傳送失敗，請稍後再試。');
      }
    } catch {
      toast.error('傳送失敗，請稍後再試。');
    } finally {
      setSendingTranscript(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      <div 
        className={`pointer-events-auto bg-white w-[350px] h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right mb-4 relative ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none h-0'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI 智慧客服</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs opacity-90">線上</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportClick}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors flex items-center gap-1"
              title="將對話紀錄傳送給人工客服"
            >
              <Mail className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">傳送紀錄</span>
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content area (messages + input) with overlay */}
        <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Consent Overlay */}
        {showConsent && (
          <div className="absolute inset-0 z-10 bg-white/95 dark:bg-gray-900/95 flex flex-col p-4 overflow-y-auto rounded-b-2xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              為提供後續協助並處理您的問題，當您確認發送時，系統將把您的基本帳號資訊（信箱、UID）與上述 AI 對話紀錄傳送給我們的客服團隊。我們承諾嚴格保護您的隱私，且不會將這些資料提供給第三方。
            </p>
            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">我已閱讀並同意上述隱私聲明</span>
            </label>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => setShowConsent(false)}
                disabled={sendingTranscript}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={!consentChecked || sendingTranscript}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {sendingTranscript ? '發送中...' : '確認發送'}
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-slate-200 text-slate-600' 
                      : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : msg.isError
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 rounded-tl-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
              {msg.isError && msg.retryContent && (
                <button
                  type="button"
                  onClick={() => retryFailedMessage(msg.id)}
                  disabled={isTyping}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重新發送
                </button>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex flex-col gap-1">
                <span className="text-xs text-slate-500 flex items-center gap-0.5">
                  AI 正在回覆
                  <span className="inline-flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span className="w-0.5 h-3 bg-indigo-500 rounded-full animate-pulse ml-0.5" />
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 flex gap-2 shrink-0">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="輸入訊息..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen 
            ? 'bg-slate-800 text-white rotate-90' 
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
};
