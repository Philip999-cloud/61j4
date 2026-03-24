import { describe, it, expect } from 'vitest';
import {
  fourSphereEquilibriumHint,
  isAxisAlignedPlaneMesh4,
  needsFourSphereEquilibriumRepair,
  patchPhysics3dTraces,
} from './utils/plotlyPhysics3dPatch';

describe('plotlyPhysics3dPatch', () => {
  it('fourSphereEquilibriumHint: 標題與中文敘述', () => {
    expect(fourSphereEquilibriumHint('Four-Sphere Equilibrium Geometry')).toBe(true);
    expect(fourSphereEquilibriumHint('此圖展示四個球體在空間中的排列')).toBe(true);
    expect(fourSphereEquilibriumHint('底部三個支撐球與頂球')).toBe(true);
    expect(fourSphereEquilibriumHint('單擺週期與重力加速度')).toBe(false);
  });

  it('isAxisAlignedPlaneMesh4: 四頂點共面', () => {
    const plane = {
      type: 'mesh3d',
      x: [-1, 1, 1, -1],
      y: [-1, -1, 1, 1],
      z: [0, 0, 0, 0],
    };
    expect(isAxisAlignedPlaneMesh4(plane)).toBe(true);
    expect(isAxisAlignedPlaneMesh4({ type: 'mesh3d', x: [0, 1, 0], y: [0, 0, 1], z: [0, 0, 0] })).toBe(false);
  });

  it('needsFourSphereEquilibriumRepair: 兩片座標面 + 小球', () => {
    const bad = [
      { type: 'mesh3d', x: [-1, 1, 1, -1], y: [-1, -1, 1, 1], z: [0, 0, 0, 0] },
      { type: 'mesh3d', x: [-1, 1, 1, -1], y: [0, 0, 0, 0], z: [-1, -1, 1, 1] },
      { type: 'scatter3d', mode: 'markers', x: [0], y: [0], z: [0.5], marker: { size: 4 } },
    ];
    const ctx = 'Four-Sphere Equilibrium 四個球體';
    expect(needsFourSphereEquilibriumRepair(bad, ctx)).toBe(true);
    const fixed = patchPhysics3dTraces(bad, { title: 'Four-Sphere Equilibrium', explanation: '四個球體' });
    expect(fixed.length).toBeGreaterThanOrEqual(5);
    expect(fixed.some((t: any) => t.name === '頂部球')).toBe(true);
  });
});
