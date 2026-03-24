// src/hooks/useGeometryExtraction.ts
// 幾何萃取的 React Hook（選擇性使用）
// 此檔案純粹新增

import { useState, useCallback } from 'react';
import type { GeometryJSON, GeometryExtractionResult } from '../types/geometry';
import type { TopologyJSON } from '../utils/topologyResolver';

export interface GeometryExtractOptions {
  /** Merged into vision topology on the server; client numbers override Gemini when finite. */
  numeric_constraints?: TopologyJSON['numeric_constraints'] | null;
}

interface UseGeometryExtractionReturn {
  extract: (
    imageBase64: string,
    mimeType?: string,
    options?: GeometryExtractOptions
  ) => Promise<GeometryJSON | null>;
  isExtracting: boolean;
  error: string | null;
}

export function useGeometryExtraction(): UseGeometryExtractionReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async (imageBase64: string, mimeType = 'image/png'): Promise<GeometryJSON | null> => {
    setIsExtracting(true);
    setError(null);

    try {
      const res = await fetch('/api/extract-geometry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const data = (await res.json()) as GeometryExtractionResult;

      if (!data.success || !data.geometry) {
        setError(data.error ?? 'Extraction failed');
        console.warn('[useGeometryExtraction] failed:', data.error, data.raw_response);
        return null;
      }

      return data.geometry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      return null;
    } finally {
      setIsExtracting(false);
    }
  },
  []
);

  return { extract, isExtracting, error };
}
