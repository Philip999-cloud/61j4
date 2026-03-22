import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { auth } from '../firebase';

interface Props {
  onOpenUserDrawer: () => void;
  theme: 'light' | 'dark';
}

const DEFAULT_AVATAR_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-400">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

export const Header: React.FC<Props> = ({ onOpenUserDrawer, theme }) => {
  const { profile } = useAppContext();
  const avatarUrl = profile?.avatarUrl || auth.currentUser?.photoURL || '';
  
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 bg-[var(--bg-main)]/80 border-[var(--border-color)]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenUserDrawer}
            className="w-10 h-10 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden shadow-sm hover:scale-105 transition-transform active:scale-95"
          >
            {profile && avatarUrl ? (
              <>
                <img 
                  src={avatarUrl} 
                  alt="User Avatar" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                  }}
                />
                <span className="hidden w-full h-full flex items-center justify-center">{DEFAULT_AVATAR_SVG}</span>
              </>
            ) : (
              profile ? DEFAULT_AVATAR_SVG : (
                <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )
            )}
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tighter transition-colors text-[var(--text-primary)]">ASEA</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Consensus Grade</span>
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-colors bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            System Active
          </div>
        </div>
      </div>
    </header>
  );
};


