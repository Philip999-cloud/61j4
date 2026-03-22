import { useState, useCallback } from 'react';
import { sendChatToGemini, type ChatTurn } from '../geminiService';
import { useAppContext } from '../contexts/AppContext';

/** 建構隱藏上下文字串，僅用於 API Payload，不渲染至 UI */
function buildHiddenContext(pathname: string, activeSubject: string): string {
  const parts: string[] = [];
  if (pathname) parts.push(`使用者目前正在瀏覽 ${pathname} 頁面`);
  if (activeSubject) parts.push(`活躍學科：${activeSubject}`);
  if (parts.length === 0) return '';
  return `\n\n[系統隱藏資訊：${parts.join('；')}]`;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  retryContent?: string;
}

export const useSupportInteractions = () => {
  const { activeSubject } = useAppContext();
  const rawPath = typeof window !== 'undefined' ? (window.location.pathname || '/') : '/';
  const pathname = activeSubject && (rawPath === '/' || !rawPath) ? `/grading/${activeSubject}` : rawPath;

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是您的 AI 批改助手。有什麼我可以幫您的嗎？',
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Bug Report State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history: ChatTurn[] = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      const hiddenCtx = buildHiddenContext(pathname, activeSubject);
      history.push({
        role: 'user',
        content: content + hiddenCtx,
      });

      const reply = await sendChatToGemini(history);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallback: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，AI 服務暫時無法使用，請稍後再試。若問題持續，建議聯絡真人客服。',
        timestamp: new Date(),
        isError: true,
        retryContent: content,
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, pathname, activeSubject]);

  const retryFailedMessage = useCallback(async (errorMessageId: string) => {
    const errorMsg = messages.find((m) => m.id === errorMessageId && m.isError && m.retryContent);
    if (!errorMsg?.retryContent) return;
    setIsTyping(true);
    setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
    const historyWithoutError = messages
      .filter((m) => m.id !== errorMessageId)
      .map((m) => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.content }));
    const lastUser = historyWithoutError.filter((t) => t.role === 'user').pop();
    const hiddenCtx = buildHiddenContext(pathname, activeSubject);
    if (lastUser && hiddenCtx) {
      const idx = historyWithoutError.lastIndexOf(lastUser);
      historyWithoutError[idx] = { ...lastUser, content: lastUser.content + hiddenCtx };
    }
    try {
      const reply = await sendChatToGemini(historyWithoutError);
      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallback: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，AI 服務暫時無法使用，請稍後再試。若問題持續，建議聯絡真人客服。',
        timestamp: new Date(),
        isError: true,
        retryContent: errorMsg.retryContent,
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, pathname, activeSubject]);

  const submitBugReport = useCallback(async (data: any) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      console.log('Bug report submitted:', data);
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError('提交失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    messages,
    isTyping,
    sendMessage,
    retryFailedMessage,
    isSubmitting,
    submitSuccess,
    submitError,
    submitBugReport,
    resetForm: () => {
      setSubmitSuccess(false);
      setSubmitError(null);
    }
  };
};
