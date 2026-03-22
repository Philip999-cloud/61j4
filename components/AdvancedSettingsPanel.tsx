import React, { useState } from 'react';

export const AdvancedSettingsPanel: React.FC = () => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(100);

  const triggerHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handlePushToggle = () => {
    triggerHapticFeedback();
    setPushEnabled(!pushEnabled);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value);
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${(newSize / 100) * 16}px`; // Assuming base is 16px
  };

  const clearCache = () => {
    triggerHapticFeedback();
    localStorage.clear(); // Or specific keys
    sessionStorage.clear();
    alert('Cache cleared successfully!');
    window.location.reload();
  };

  return (
    <div className="space-y-8 p-4">
      {/* Push Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-zinc-900 dark:text-white">Push Notifications</h4>
          <p className="text-xs text-zinc-500">Receive updates and offers.</p>
        </div>
        <button 
          onClick={handlePushToggle}
          className={`w-12 h-6 rounded-full transition-colors relative ${pushEnabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${pushEnabled ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {/* Accessibility */}
      <div>
        <div className="flex justify-between mb-2">
          <h4 className="font-bold text-zinc-900 dark:text-white">Font Size</h4>
          <span className="text-xs text-zinc-500">{fontSize}%</span>
        </div>
        <input 
          type="range" 
          min="80" 
          max="150" 
          value={fontSize} 
          onChange={handleFontSizeChange}
          className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Performance */}
      <div>
        <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Performance</h4>
        <button 
          onClick={clearCache}
          className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          Clear App Cache
        </button>
      </div>
    </div>
  );
};
