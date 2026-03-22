import React from 'react';

interface ProfileProgressWidgetProps {
  score: number; // 0 to 100
  className?: string;
}

/**
 * ProfileProgressWidget
 * A standalone component to display profile completeness.
 * 
 * Usage:
 * import { ProfileProgressWidget } from './components/common/ProfileProgressWidget';
 * <ProfileProgressWidget score={75} />
 */
export const ProfileProgressWidget: React.FC<ProfileProgressWidgetProps> = ({ 
  score, 
  className = '' 
}) => {
  // Clamp score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, score));
  const isComplete = normalizedScore === 100;

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-700">Profile Completeness</h3>
        <span className={`text-sm font-bold ${isComplete ? 'text-emerald-500' : 'text-indigo-600'}`}>
          {normalizedScore}%
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3 overflow-hidden">
        {/* Progress Bar Fill */}
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
            isComplete ? 'bg-emerald-500' : 'bg-indigo-600'
          }`}
          style={{ width: `${normalizedScore}%` }}
        />
      </div>

      {/* Call to Action (Only if not complete) */}
      {!isComplete && (
        <div className="bg-indigo-50 rounded-lg p-3 flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-indigo-800 font-medium">
              Almost perfect!
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Complete your setup to unlock more precise AI grading.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
