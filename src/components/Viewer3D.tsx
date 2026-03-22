import React, { useEffect, useRef, useState } from 'react';

interface Viewer3DProps {
  cid?: string;
  pdb?: string;
  mol?: string;
  className?: string;
}

const STYLE_BALL_STICK = {
  stick: { radius: 0.14, colorscheme: 'Jmol' },
  sphere: { radius: 0.35, colorscheme: 'Jmol' },
};

function wait3Dmol(maxWait = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).$3Dmol) return resolve((window as any).$3Dmol);
    const start = Date.now();
    const poll = setInterval(() => {
      if ((window as any).$3Dmol) { clearInterval(poll); resolve((window as any).$3Dmol); }
      else if (Date.now() - start > maxWait) { clearInterval(poll); reject(new Error('3Dmol.js failed to load')); }
    }, 200);
  });
}

function applyModelStyle(viewer: any) {
  viewer.setStyle({}, STYLE_BALL_STICK);
  viewer.zoomTo();
  viewer.spin(true);
  viewer.render();
}

export const Viewer3D: React.FC<Viewer3DProps> = ({ cid, pdb, mol, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const init = async () => {
      setStatus('loading');
      setErrorMsg('');

      let $3Dmol: any;
      try {
        $3Dmol = await wait3Dmol();
      } catch {
        if (!cancelled) { setStatus('error'); setErrorMsg('3Dmol.js 函式庫載入失敗'); }
        return;
      }

      if (cancelled || !containerRef.current) return;

      if (viewerRef.current) {
        try { viewerRef.current.removeAllModels(); viewerRef.current.clear(); } catch { /* ignore */ }
      }

      const viewer = $3Dmol.createViewer(containerRef.current, {
        backgroundColor: 0xffffff,
        backgroundAlpha: 0,
      });
      viewerRef.current = viewer;

      if (cid) {
        try {
          let sdfData: string | null = null;
          const res3d = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`);
          if (res3d.ok) {
            sdfData = await res3d.text();
          } else {
            const res2d = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF`);
            if (res2d.ok) sdfData = await res2d.text();
          }
          if (cancelled) return;
          if (sdfData) {
            viewer.addModel(sdfData, 'sdf');
            applyModelStyle(viewer);
            setStatus('ready');
          } else {
            setStatus('error');
            setErrorMsg(`無法載入分子模型 (CID: ${cid})`);
          }
        } catch {
          if (!cancelled) { setStatus('error'); setErrorMsg(`網路錯誤 (CID: ${cid})`); }
        }
      } else if (pdb) {
        viewer.addModel(pdb, 'pdb');
        applyModelStyle(viewer);
        if (!cancelled) setStatus('ready');
      } else if (mol) {
        viewer.addModel(mol, 'mol');
        applyModelStyle(viewer);
        if (!cancelled) setStatus('ready');
      } else {
        if (!cancelled) { setStatus('error'); setErrorMsg('未提供分子資料'); }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try { viewerRef.current.removeAllModels(); viewerRef.current.clear(); } catch { /* ignore */ }
        viewerRef.current = null;
      }
    };
  }, [cid, pdb, mol]);

  return (
    <div className={`relative w-full max-w-md mx-auto h-64 md:h-80 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner my-4 ${className}`}>
      <div ref={containerRef} className="w-full h-full" style={{ position: 'relative' }} />
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-50/80 dark:bg-zinc-900/80 z-10 backdrop-blur-sm">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[var(--text-secondary)]">載入 3D 分子模型中...</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-900/80 z-10 p-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-xs font-bold text-red-500 text-center">{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default Viewer3D;
