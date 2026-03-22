/**
 * CacheManager
 * Utility for managing application cache safely.
 */
export const CacheManager = {
  /**
   * Calculates the approximate size of localStorage usage.
   * Returns a formatted string (e.g., "1.42 MB").
   */
  calculateCacheSize: (): string => {
    if (typeof window === 'undefined') return '0 KB';

    let totalBytes = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalBytes += (key.length + value.length) * 2; // UTF-16 characters use 2 bytes
        }
      }
    }

    if (totalBytes === 0) return '0 KB';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(totalBytes) / Math.log(k));
    
    return parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Clears application cache (localStorage) but preserves critical keys.
   * @param criticalKeys Array of keys to preserve (default: ['user_token', 'user_id'])
   */
  clearAppCache: (criticalKeys: string[] = ['user_token', 'user_id']): void => {
    if (typeof window === 'undefined') return;

    const preservedData: Record<string, string> = {};

    // Backup critical data
    criticalKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        preservedData[key] = value;
      }
    });

    // Clear all storage
    localStorage.clear();

    // Restore critical data
    Object.entries(preservedData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    console.log(`Cache cleared. Preserved keys: ${criticalKeys.join(', ')}`);
  }
};
