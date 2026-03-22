import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStay: () => void;
}

export const SubscriptionRetention: React.FC<Props> = ({ isOpen, onClose, onStay }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
        <div className="text-4xl mb-4">😢</div>
        <h3 className="text-xl font-bold mb-2 dark:text-white">Wait! Don't go.</h3>
        <p className="text-zinc-500 mb-6">Get 50% off your first month if you stay.</p>
        <div className="space-y-3">
          <button onClick={onStay} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Claim 50% Off</button>
          <button onClick={onClose} className="w-full py-3 text-zinc-400 font-bold hover:text-zinc-600 dark:hover:text-zinc-200">I still want to cancel</button>
        </div>
      </div>
    </div>
  );
};
