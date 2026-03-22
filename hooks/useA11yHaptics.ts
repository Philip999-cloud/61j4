import { useCallback } from 'react';

interface A11yHapticsResult {
  getDynamicSize: (baseRem: number, scaleFactor?: number) => string;
  triggerLightTouch: () => void;
  triggerSuccess: () => void;
  triggerError: () => void;
}

export const useA11yHaptics = (): A11yHapticsResult => {
  
  // Dynamic Type Calculation
  const getDynamicSize = useCallback((baseRem: number, scaleFactor: number = 1): string => {
    // In a real app, scaleFactor might come from a global context or user preference
    return `${baseRem * scaleFactor}rem`;
  }, []);

  // Haptic Feedback using Web Vibration API
  const triggerLightTouch = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10); // Very short vibration for UI interaction
    }
  }, []);

  const triggerSuccess = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]); // Two short pulses
    }
  }, []);

  const triggerError = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]); // Three longer pulses
    }
  }, []);

  return {
    getDynamicSize,
    triggerLightTouch,
    triggerSuccess,
    triggerError
  };
};
