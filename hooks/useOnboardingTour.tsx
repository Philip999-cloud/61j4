import { useState, useEffect } from 'react';

export const useOnboardingTour = (tourKey: string) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    const hasToured = localStorage.getItem(`tour_completed_${tourKey}`);
    if (!hasToured) {
      const timer = setTimeout(() => setCurrentStep(1), 500);
      return () => clearTimeout(timer);
    }
  }, [tourKey]);

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => Math.max(1, prev - 1));
  
  const endTour = () => {
    localStorage.setItem(`tour_completed_${tourKey}`, 'true');
    setCurrentStep(0);
  };

  return { currentStep, nextStep, prevStep, endTour };
};

import React from 'react';
import { X } from 'lucide-react';

interface TooltipOnboardingProps {
  step: number;
  currentStep: number;
  totalSteps: number;
  title?: string;
  content: string;
  children: React.ReactNode;
  onNext: () => void;
  onEnd: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TooltipOnboarding: React.FC<TooltipOnboardingProps> = ({
  step, currentStep, totalSteps, title = "小提示", content, children, onNext, onEnd, position = 'bottom'
}) => {
  const isActive = step === currentStep;

  if (!isActive) return <>{children}</>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3'
  };

  return (
    <div className="relative z-[100]">
      <div className="relative z-[101] ring-4 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 rounded-lg pointer-events-none">
        {children}
      </div>
      <div className="fixed inset-0 bg-black/60 z-[90]" onClick={onEnd} />
      <div className={`absolute ${positionClasses[position]} z-[102] w-72 animate-in fade-in zoom-in duration-300`}>
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-5 rounded-2xl shadow-2xl relative border border-gray-100 dark:border-gray-700">
          <button onClick={onEnd} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex justify-between items-center">
            <span>{title}</span>
            <span className="text-gray-400 font-normal">{step} / {totalSteps}</span>
          </div>
          <p className="text-sm leading-relaxed mb-4 text-gray-600 dark:text-gray-300">{content}</p>
          <div className="flex justify-between items-center mt-2">
            <button onClick={onEnd} className="text-sm text-gray-500 hover:text-gray-700 font-medium">跳過教學</button>
            <button onClick={step === totalSteps ? onEnd : onNext} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors">
              {step === totalSteps ? '開始體驗' : '下一步'}
            </button>
          </div>
          <div className={`absolute w-4 h-4 bg-white dark:bg-gray-800 rotate-45 
            ${position === 'bottom' ? '-top-2 left-1/2 -translate-x-1/2 border-l border-t border-gray-100 dark:border-gray-700' : ''}
            ${position === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2 border-r border-b border-gray-100 dark:border-gray-700' : ''}
          `} />
        </div>
      </div>
    </div>
  );
};
