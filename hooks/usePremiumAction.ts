import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';

export const usePremiumAction = () => {
  const { profile } = useAppContext();
  const [showPaywall, setShowPaywall] = useState(false);

  const execute = (action: () => void) => {
    if (profile?.isPro) {
      action();
    } else {
      setShowPaywall(true);
    }
  };

  return {
    execute,
    showPaywall,
    setShowPaywall
  };
};
