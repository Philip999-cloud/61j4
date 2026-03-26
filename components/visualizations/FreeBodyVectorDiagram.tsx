import React from 'react';
import { FreeBodyDiagram } from '../physics/FreeBodyDiagram';
import type { ForceVector } from '../physics/FreeBodyDiagram';

/**
 * Phase 2 計畫書命名：參數化受力向量圖。
 * 與 `free_body_diagram` 的 `forces[]` 契約一致；底層沿用既有 Canvas 引擎。
 */
export const FreeBodyVectorDiagram: React.FC<{
  vectors: ForceVector[];
  objectShape?: 'box' | 'circle' | 'dot';
}> = ({ vectors, objectShape = 'box' }) => (
  <FreeBodyDiagram forces={vectors} objectShape={objectShape} />
);

export type { ForceVector };
