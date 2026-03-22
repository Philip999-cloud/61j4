import React from 'react';

interface ProfileProgressWidgetProps {
  currentScore: number;
  totalScore: number;
  onCompleteProfile?: () => void;
  className?: string;
}

/**
 * ProfileProgressWidget
 * 
 * Usage:
 * import { ProfileProgressWidget } from './components/ProfileProgressWidget';
 * 
 * <ProfileProgressWidget 
 *   currentScore={3} 
 *   totalScore={5} 
 *   onCompleteProfile={() => navigate('/settings/profile')} 
 * />
 */
export const ProfileProgressWidget: React.FC<ProfileProgressWidgetProps> = ({
  currentScore,
  totalScore,
  onCompleteProfile,
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((currentScore / totalScore) * 100)));
  const isComplete = percentage === 100;

  if (isComplete) return null;

  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Profile Completeness</h3>
        <span className="text-xs font-bold text-indigo-600">{percentage}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Finish your profile to unlock full features.
        </p>
        <button
          onClick={onCompleteProfile}
          className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100 transition-colors"
        >
          Complete Now
        </button>
      </div>
    </div>
  );
};
