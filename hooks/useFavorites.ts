import { useState, useEffect, useCallback } from 'react';

// 定義收藏資料格式
export interface FavoriteItem {
  id: string;
  subject: string;
  date: string;
  snippet: string;
  data: any; // 存放完整的批改結果，方便日後再次開啟
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // 讀取並同步 LocalStorage
  const loadFavorites = useCallback(() => {
    const saved = localStorage.getItem('asea_favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    loadFavorites();
    // 監聽自定義事件，讓不同元件 (如 ResultsDisplay 和 UserCenter) 能瞬間同步
    const handleSync = () => loadFavorites();
    window.addEventListener('favorites_updated', handleSync);
    return () => window.removeEventListener('favorites_updated', handleSync);
  }, [loadFavorites]);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    const saved = localStorage.getItem('asea_favorites');
    const currentFavs: FavoriteItem[] = saved ? JSON.parse(saved) : [];
    
    const exists = currentFavs.find(f => f.id === item.id);
    let newFavs;
    if (exists) {
      // 取消收藏
      newFavs = currentFavs.filter(f => f.id !== item.id);
    } else {
      // 新增收藏 (放在最前面)
      newFavs = [item, ...currentFavs];
    }
    
    localStorage.setItem('asea_favorites', JSON.stringify(newFavs));
    setFavorites(newFavs);
    // 觸發全域更新事件
    window.dispatchEvent(new Event('favorites_updated'));
  }, []);

  const isFavorited = (id: string) => favorites.some(f => f.id === id);

  return { favorites, toggleFavorite, isFavorited };
};
