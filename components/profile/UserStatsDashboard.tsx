import React from 'react';
import { FileText, Clock, Calendar, TrendingUp } from 'lucide-react';
import { UserProfile } from '../../hooks/useUserProfileManager';

interface UserStatsDashboardProps {
  stats: UserProfile['stats'];
  isLoading?: boolean;
  isNewUser?: boolean;
}

/** 骨架屏：保持與實際卡片相同的佈局 */
const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden animate-pulse">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <FileText className="w-24 h-24 transform rotate-12" />
      </div>
      <div className="relative z-10">
        <div className="h-4 w-24 bg-white/30 rounded mb-2" />
        <div className="h-10 w-16 bg-white/40 rounded mb-1" />
        <div className="h-3 w-20 bg-white/20 rounded mt-4" />
      </div>
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-slate-100 dark:border-gray-700 shadow-sm animate-pulse">
      <div className="h-10 w-10 bg-slate-200 dark:bg-gray-600 rounded-lg mb-4" />
      <div className="h-8 w-20 bg-slate-200 dark:bg-gray-600 rounded mb-1" />
      <div className="h-4 w-32 bg-slate-100 dark:bg-gray-700 rounded" />
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-slate-100 dark:border-gray-700 shadow-sm animate-pulse">
      <div className="h-10 w-10 bg-slate-200 dark:bg-gray-600 rounded-lg mb-4" />
      <div className="h-8 w-16 bg-slate-200 dark:bg-gray-600 rounded mb-2" />
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div key={day} className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-gray-700" />
        ))}
      </div>
    </div>
  </div>
);

export const UserStatsDashboard: React.FC<UserStatsDashboardProps> = ({
  stats,
  isLoading = false,
  isNewUser = false
}) => {
  if (isLoading) {
    return <StatsSkeleton />;
  }

  if (isNewUser) {
    return (
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-2xl p-6 border border-slate-100 dark:border-gray-700 text-center">
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
            開始您的第一道題目來解鎖數據！
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            完成批改後，您的學習統計將在此顯示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Graded Papers */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <FileText className="w-24 h-24 transform rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium">已批改試卷</span>
          </div>
          <div className="text-4xl font-black mb-1 tracking-tight">
            {stats.gradedPapers}
          </div>
          <div className="text-xs opacity-75 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            較上週成長 12%
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-white dark:bg-gray-800 h-full rounded-full w-[70%]" />
          </div>
        </div>
      </div>

      {/* Card 2: Time Saved */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 group">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            效率提升
          </span>
        </div>
        <div className="text-3xl font-bold text-slate-800 mb-1">
          {stats.timeSavedHours} <span className="text-sm font-normal text-slate-500">小時</span>
        </div>
        <p className="text-sm text-slate-500">節省的批改時間</p>
      </div>

      {/* Card 3: Active Days */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 group">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
            <Calendar className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
            本週活躍
          </span>
        </div>
        <div className="text-3xl font-bold text-slate-800 mb-1">
          {stats.activeDays} <span className="text-sm font-normal text-slate-500">天</span>
        </div>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div
              key={day}
              className={`h-1.5 flex-1 rounded-full ${
                day <= stats.activeDays ? 'bg-orange-400' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
