import { useState, useCallback } from 'react';

const SUBSCRIPTION_API_URL = import.meta.env.VITE_SUBSCRIPTION_API_URL ?? '';

interface SubscriptionStatus {
  isActive: boolean;
  isGracePeriod: boolean;
  expiryDate: Date | null;
}

/**
 * useSubscriptionLogic
 * 管理訂閱狀態，呼叫後端 API 檢查 grace period 與取消訂閱。
 */
export const useSubscriptionLogic = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: false,
    isGracePeriod: false,
    expiryDate: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  const checkGracePeriod = useCallback(async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (!SUBSCRIPTION_API_URL) {
        setIsLoading(false);
        return false;
      }
      const res = await fetch(`${SUBSCRIPTION_API_URL}/grace?userId=${encodeURIComponent(userId)}`);
      const data = await res.json().catch(() => ({}));
      const isGrace = data?.isGracePeriod === true;
      setStatus(prev => ({ ...prev, isGracePeriod: isGrace }));
      setIsLoading(false);
      return isGrace;
    } catch (err) {
      console.error('checkGracePeriod:', err);
      setIsLoading(false);
      return false;
    }
  }, []);

  const cancelSubscription = useCallback(async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (!SUBSCRIPTION_API_URL) {
        setIsLoading(false);
        return false;
      }
      const res = await fetch(SUBSCRIPTION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', userId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success === true) {
        setStatus(prev => ({ ...prev, isActive: false, expiryDate: new Date() }));
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('cancelSubscription:', err);
      setIsLoading(false);
      return false;
    }
  }, []);

  return {
    status,
    isLoading,
    checkGracePeriod,
    cancelSubscription
  };
};
