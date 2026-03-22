import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TooltipOnboardingProps {
  step: number;
  currentStep: number;
  content: string;
  children: React.ReactNode;
  onClose?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TooltipOnboarding: React.FC<TooltipOnboardingProps> = ({
  step,
  currentStep,
  content,
  children,
  onClose,
  position = 'bottom'
}) => {
  const isActive = step === currentStep;
  const [isVisible, setIsVisible] = useState(true);

  if (!isActive || !isVisible) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-indigo-600 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-indigo-600 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-indigo-600 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-indigo-600 border-y-transparent border-l-transparent'
  };

  return (
    <div className="relative inline-block z-50">
      {/* Highlight effect on the child */}
      <div className="relative z-50 ring-2 ring-indigo-400 ring-offset-2 rounded-lg">
        {children}
      </div>

      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />

      {/* Tooltip */}
      <div className={`absolute ${positionClasses[position]} z-50 w-64 animate-in fade-in zoom-in-95 duration-200`}>
        <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-xl relative">
          <button 
            onClick={() => {
              setIsVisible(false);
              if (onClose) onClose();
            }}
            className="absolute top-2 right-2 text-indigo-200 hover:text-white"
          >
            <X size={14} />
          </button>
          
          <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">
            Tip #{step}
          </div>
          <p className="text-sm leading-relaxed">
            {content}
          </p>

          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`} />
        </div>
      </div>
    </div>
  );
};
