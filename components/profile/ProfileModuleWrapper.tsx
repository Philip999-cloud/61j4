import React from 'react';
import { useUserProfileManager } from '../../hooks/useUserProfileManager';
import { AvatarManager } from './AvatarManager';
import { AccountBindingList } from './AccountBindingList';
import { UserStatsDashboard } from './UserStatsDashboard';

export const ProfileModuleWrapper: React.FC = () => {
  const { 
    user, 
    isLoading,
    isNewUser,
    isUploading, 
    isBindingLoading, 
    updateAvatar, 
    toggleAccountBinding 
  } = useUserProfileManager();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="shrink-0">
          <AvatarManager 
            avatarUrl={user.avatarUrl}
            isUploading={isUploading}
            onUpload={updateAvatar}
          />
        </div>
        
        <div className="flex-1 text-center md:text-left w-full">
          <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
          <p className="text-slate-500 mb-6">{user.email}</p>
          
          <UserStatsDashboard stats={user.stats} isLoading={isLoading} isNewUser={isNewUser} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Account Settings */}
        <div className="space-y-6">
          <AccountBindingList 
            bindings={user.bindings}
            loadingProvider={isBindingLoading}
            onToggle={toggleAccountBinding}
          />
        </div>

        {/* Right Column: Other Settings (Placeholder for future expansion) */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 min-h-[200px]">
          <p>更多個人化設定即將推出...</p>
        </div>
      </div>
    </div>
  );
};
