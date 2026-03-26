import { useMemo } from 'react';
import { filterRenderableVisualizations } from '../utils/validateStemVisualization';

/** 將 stem visualization 陣列過濾為可安全渲染項目（與 VisualizationRenderer 一致） */
export function useFilteredStemVisualizations<T>(items: T[] | undefined | null): T[] {
  return useMemo(() => filterRenderableVisualizations(items), [items]);
}
