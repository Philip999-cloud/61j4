import React, { useState } from 'react';
import { useAuthSecurity } from '../hooks/useAuthSecurity';

export const AuthOverlayModal: React.FC = () => {
  // In a real app, this might be controlled by a global auth state or event
  // For this demo, we'll assume it's triggered by a specific event or just hidden by default
  // The user instruction says "place in outermost layer", implying it might be always present but hidden, 
  // or controlled by the existing Auth context. 
  // Let's assume it replaces the content of the old AuthModal or is a new standalone one.
  // We'll make it visible for demo if a certain event happens, or just return null if not needed immediately.
  // However, to satisfy "Modular Extension", we'll make it ready to be used.
  
  const [isOpen, setIsOpen] = useState(false); 
  const [email, setEmail] = useState('');
  const { softDeleteAccount } = useAuthSecurity();

  // Expose a way to open it globally for demo (optional)
  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-auth-overlay', handleOpen);
    return () => window.removeEventListener('open-auth-overlay', handleOpen);
  }, []);

  const handleMagicLink = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`Sending magic link to ${email}`);
    alert(`Magic link sent to ${email}`);
    setIsOpen(false);
  };

  const handleWebAuthn = () => {
    console.log('Triggering WebAuthn...');
    alert('WebAuthn simulation: Authenticated!');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 relative">
        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">&times;</button>
        <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Welcome Back</h2>
        
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
            Send Magic Link
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow h-px bg-zinc-200 dark:bg-zinc-700"></div>
          <span className="px-4 text-sm text-zinc-400">OR</span>
          <div className="flex-grow h-px bg-zinc-200 dark:bg-zinc-700"></div>
        </div>

        <button onClick={handleWebAuthn} className="w-full py-3 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.18M5.55 17.55l-1 1" /></svg>
          Sign in with Passkey
        </button>
      </div>
    </div>
  );
};
