import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import AseaWhitepaper from './common/AseaWhitepaper';
import PrivacyPolicyView from './common/PrivacyPolicyView';

// 🚀 效能優化：使用 Singleton 快取模式將龐大計算移出 React 元件
interface Particle { ox: number; oy: number; x: number; y: number; r: number; delay: number; isHub: boolean; color: string; vx: number; vy: number; }
interface Edge { p1: Particle; p2: Particle; distSq: number; alphaMulti: number; }

let cachedBrainData: { particles: Particle[], edges: Edge[] } | null = null;

const getBrainData = () => {
  if (cachedBrainData) return cachedBrainData;

  const size = 600;
  let seed = 88;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const getBrainDensity = (x: number, y: number) => {
    const cx = 300;
    const cy = 300;
    const dx = x - cx;
    const dy = y - cy;
    
    const ny = dy / 190;
    if (ny < -1.1 || ny > 1.1) return 0;

    const baseW = 160 * Math.sqrt(Math.max(0, 1 - ny * ny)) * (1 + 0.18 * ny);
    const noise = Math.sin(y / 8 + Math.cos(x / 12) * 2) * 7 + Math.cos(x / 6) * 4;
    const outerW = baseW + noise;

    const adx = Math.abs(dx);
    const fissureWobble = Math.sin(y / 25) * 4;
    const trueDx = Math.abs(dx - fissureWobble);
    const fissureGap = 6 + Math.cos(y / 30) * 2.5;

    if (trueDx < fissureGap) return 0; 
    if (trueDx > outerW) return 0;     

    const distToEdge = outerW - trueDx;
    let density = 0;
    
    if (distToEdge < 35) density = 1.0; 
    else density = 0.15 + rand() * 0.1; 

    if (trueDx < fissureGap + 15) density = 0.9;
    if (ny > -0.25 && ny < -0.05 && trueDx > outerW * 0.5) {
        const sulcusDist = Math.abs(dy - (-30));
        if (sulcusDist < 12) density *= (sulcusDist / 12);
    }
    return density;
  };

  const particles: Particle[] = [];
  const edges: Edge[] = [];
  const TOTAL_PARTICLES = 1600; 

  let attempts = 0;
  while (particles.length < TOTAL_PARTICLES && attempts < 50000) {
    attempts++;
    const x = rand() * size;
    const y = rand() * size;
    const density = getBrainDensity(x, y);
    
    if (rand() < density) {
      const isLeft = x < 300;
      const baseColor = isLeft ? '0, 240, 255' : '217, 70, 239';
      const isHub = rand() > 0.96;
      
      particles.push({
        ox: x, oy: y, 
        x, y, 
        r: isHub ? (1.5 + rand() * 1.5) : (0.4 + rand() * 0.8),
        delay: rand() * 1000, 
        isHub,
        color: isHub ? '255, 255, 255' : baseColor, 
        vx: (rand() - 0.5) * 0.2, 
        vy: (rand() - 0.5) * 0.2
      });
    }
  }

  for (let i = 0; i < particles.length; i++) {
    let connections = 0;
    for (let j = i + 1; j < particles.length; j++) {
      if (connections > 3) break; 
      const p1 = particles[i];
      const p2 = particles[j];
      const isCross = (p1.x < 300 && p2.x >= 300) || (p1.x >= 300 && p2.x < 300);
      if (isCross) { if (p1.y < 250 || p1.y > 350) continue; }

      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distSq = dx * dx + dy * dy;
      const maxDistSq = p1.isHub || p2.isHub ? 1600 : 900; 
      
      if (distSq < maxDistSq) {
        edges.push({ p1, p2, distSq, alphaMulti: 1 - Math.sqrt(distSq) / Math.sqrt(maxDistSq) });
        connections++;
      }
    }
  }

  cachedBrainData = { particles, edges };
  return cachedBrainData;
};

const useCanvasBrain = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const size = 600;
    canvas.width = size;
    canvas.height = size;

    const { particles, edges } = getBrainData();

    particles.forEach(p => { p.x = p.ox; p.y = p.oy; });

    let animationFrameId: number;
    let startTime = performance.now();

    const render = (time: number) => {
      const elapsed = time - startTime;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'screen';

      if (elapsed < 1600) {
        const isConverging = elapsed > 1000;
        const globalAlphaBoost = isConverging ? Math.min(1, (elapsed - 1000) / 400) : 0;

        edges.forEach(edge => {
          const triggerTime = Math.max(edge.p1.delay, edge.p2.delay);
          if (elapsed > triggerTime) {
            const age = elapsed - triggerTime;
            const edgeAlpha = Math.min(1, age / 400); 
            const finalAlpha = Math.min(1, (edgeAlpha * edge.alphaMulti * 0.4) + (globalAlphaBoost * 0.5));
            ctx.beginPath();
            ctx.moveTo(edge.p1.x, edge.p1.y);
            ctx.lineTo(edge.p2.x, edge.p2.y);
            ctx.strokeStyle = `rgba(${edge.p1.color}, ${finalAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });

        particles.forEach(p => {
          if (elapsed > p.delay) {
            p.x += p.vx;
            p.y += p.vy;
            const age = elapsed - p.delay;
            let nodeAlpha = Math.min(1, age / 300);
            const finalAlpha = Math.min(1, nodeAlpha + globalAlphaBoost);

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${finalAlpha})`; 
            ctx.fill();

            if (p.isHub) {
              const grad = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, p.r * 5);
              const haloColor = p.x < 300 ? '0, 240, 255' : '217, 70, 239';
              grad.addColorStop(0, `rgba(255, 255, 255, ${finalAlpha * 0.8})`);
              grad.addColorStop(0.3, `rgba(${haloColor}, ${finalAlpha * 0.4})`);
              grad.addColorStop(1, `rgba(${haloColor}, 0)`);
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });

        if (isConverging) {
          const coreRadius = globalAlphaBoost * 140;
          ctx.save();
          ctx.translate(size/2, size/2);
          ctx.scale(0.6, 1); 
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
          grad.addColorStop(0, `rgba(255, 255, 255, ${globalAlphaBoost})`);
          grad.addColorStop(0.4, `rgba(139, 92, 246, ${globalAlphaBoost * 0.5})`); 
          grad.addColorStop(1, `rgba(0, 240, 255, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.globalCompositeOperation = 'source-over';

      if (elapsed >= 1600 && elapsed < 2200) {
        const rippleProgress = Math.min(1, (elapsed - 1600) / 400);
        const scale = rippleProgress < 0.5 ? 2 * rippleProgress * rippleProgress : 1 - Math.pow(-2 * rippleProgress + 2, 2) / 2;
        const maxRadius = size * 1.5;
        const currentRadius = scale * maxRadius;

        const grad = ctx.createRadialGradient(size/2, size/2, Math.max(0, currentRadius * 0.7), size/2, size/2, currentRadius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(size/2, size/2, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.beginPath();
        ctx.arc(size/2, size/2, Math.max(0, currentRadius * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }

      if (elapsed < 2300) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
};

export function AseaSplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState(0); 
  const [showWhitepaper, setShowWhitepaper] = useState(false); 
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useCanvasBrain(canvasRef);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 50);    
    const t2 = setTimeout(() => setPhase(2), 1000);  
    const t3 = setTimeout(() => setPhase(3), 1600);  
    const t4 = setTimeout(() => setPhase(4), 1900);  
    const t5 = setTimeout(() => setShowWhitepaper(true), 2300); 

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#030712] overflow-hidden transition-opacity duration-400 ease-out ${showWhitepaper ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${showWhitepaper ? 'opacity-0' : 'opacity-100'}`}>
        <div className={`relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px] shrink-0 transition-opacity duration-400 ${phase >= 4 ? 'opacity-0' : 'opacity-100'}`}>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]" style={{ transform: 'translateZ(0)' }} />
        </div>
        <div className={`mt-10 flex flex-col items-center justify-center transition-all duration-700 ease-out w-full px-4 ${phase >= 2 ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <div className="text-white text-[13px] sm:text-base md:text-xl font-black uppercase font-sans mb-3 text-center whitespace-nowrap" style={{ textShadow: '0 0 20px rgba(0, 240, 255, 0.8), 0 0 40px rgba(217, 70, 239, 0.6)', letterSpacing: '0.4em', paddingLeft: '0.4em' }}>
            Consensus Grade
          </div>
          <div className="h-[2px] w-12 sm:w-16 bg-gradient-to-r from-[#00f3ff] via-white to-[#d946ef]"></div>
        </div>
      </div>

      {showWhitepaper && (
        <div className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-700 z-10">
          <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-full max-h-[90vh] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-gray-700 flex items-center gap-4 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-800 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg"><BookOpen className="w-6 h-6" /></div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">歡迎使用 ASEA 系統</h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">在開始之前，邀請您了解我們的核心理念、架構與隱私權政策</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar relative bg-white dark:bg-gray-800">
              <AseaWhitepaper />
              <div className="my-16 border-t-2 border-dashed border-slate-200 dark:border-gray-700"></div>
              <PrivacyPolicyView />
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-500 dark:text-gray-400">向下滾動閱讀完整技術規格與隱私權政策。</p>
              <button onClick={onComplete} className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 group transition-all shadow-md active:scale-95">
                <span>接受並進入系統</span><ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
