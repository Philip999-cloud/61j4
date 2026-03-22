import React, { useState } from 'react';
import { useUserProfileManager } from '../hooks/useUserProfileManager';

export const UserProfileProgress: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { user, isLoading } = useUserProfileManager();
  const progress = user.profileCompleteness ?? 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-sm mx-auto mt-4 animate-pulse">
        <div className="flex justify-between mb-1">
          <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-3 w-8 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto mt-4">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer group"
      >
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
          <span>Profile Completion</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-lg animate-in slide-in-from-top-2">
          <h3 className="font-bold text-zinc-800 dark:text-white mb-3">Complete your profile</h3>
          <div className="space-y-3">
            <input type="text" placeholder="School / Institution" className="w-full p-2 text-sm rounded-lg border dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            <input type="text" placeholder="Grade Level" className="w-full p-2 text-sm rounded-lg border dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            <button className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold">Save Details</button>
          </div>
        </div>
      )}
    </div>
  );
};
