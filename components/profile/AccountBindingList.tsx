import React from 'react';
import { Check, X, Loader2, Link as LinkIcon, Unlink } from 'lucide-react';
import { UserProfile } from '../../hooks/useUserProfileManager';

interface AccountBindingListProps {
  bindings: UserProfile['bindings'];
  loadingProvider: string | null;
  onToggle: (provider: keyof UserProfile['bindings']) => void;
}

export const AccountBindingList: React.FC<AccountBindingListProps> = ({
  bindings,
  loadingProvider,
  onToggle,
}) => {
  const providers = [
    { id: 'google', name: 'Google', icon: 'G' },
    { id: 'apple', name: 'Apple', icon: '' },
    { id: 'facebook', name: 'Facebook', icon: 'f' },
  ] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-gray-700">
      <h3 className="text-lg font-bold text-slate-800 mb-4">帳號綁定</h3>
      <div className="space-y-3">
        {providers.map((provider) => {
          const isConnected = bindings[provider.id];
          const isLoading = loadingProvider === provider.id;

          return (
            <div 
              key={provider.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center font-bold text-slate-700 dark:text-gray-300 text-lg">
                  {provider.icon}
                </div>
                <div>
                  <div className="font-medium text-slate-700">{provider.name}</div>
                  <div className={`text-xs flex items-center gap-1 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isConnected ? (
                      <>
                        <Check className="w-3 h-3" /> 已連結
                      </>
                    ) : (
                      '未連結'
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onToggle(provider.id)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isConnected
                    ? 'bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isConnected ? (
                  <>
                    <Unlink className="w-4 h-4" /> 解除
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" /> 連結
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
