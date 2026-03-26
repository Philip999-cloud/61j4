import React, { useEffect, useRef, useState } from 'react';

/** HTML 實體與數字參照解碼，供化合物顯示名／PubChem 查詢前正規化 */
export function safeDecodeCompoundLabel(input: string): string {
  if (input == null || input === '') return '';
  let s = String(input);
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  s = s.replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return s;
}

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

export function containsChineseForPubchemBlock(s: string): boolean {
  return CJK_RE.test(s);
}

export function compoundLookupStringContainsChinese(s: string): boolean {
  return CJK_RE.test(s);
}

/** PubChem compound/name 僅送可列印 ASCII，避免異常字元 */
export function isPubchemAsciiNameSafe(s: string): boolean {
  if (!s || !s.trim()) return false;
  return /^[\x20-\x7E]+$/.test(s);
}

const wait3Dmol = (): Promise<any> => {
  return new Promise((resolve) => {
    if ((window as any).$3Dmol) return resolve((window as any).$3Dmol);
    const interval = setInterval(() => {
      if ((window as any).$3Dmol) {
        clearInterval(interval);
        resolve((window as any).$3Dmol);
      }
    }, 100);
    setTimeout(() => { clearInterval(interval); }, 3000);
  });
};

interface Viewer3DProps {
  cid?: string | number;
  pdb?: string;
  mol?: string;
  smiles?: string;
  className?: string;
}

type ViewerStatus = 'loading' | 'ready' | 'image_fallback' | 'error';

export const Viewer3D: React.FC<Viewer3DProps> = ({ cid, pdb, mol, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PubChem 提供的 2D 結構圖（PNG），作為最終 fallback
  const fallbackImageUrl = cid
    ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`
    : null;

  // 1. 初次載入：建立 Canvas (加入尺寸防護與 ResizeObserver)
  useEffect(() => {
    let isMounted = true;
    let observer: ResizeObserver | null = null;

    const initViewer = async () => {
      if (!containerRef.current || viewerRef.current) return;
      // 尺寸檢查：防止 Framebuffer 零尺寸錯誤
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      // #region agent log
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '95c4aa' },
        body: JSON.stringify({
          sessionId: '95c4aa',
          location: 'Viewer3D.tsx:initViewer',
          message: '3Dmol container size before createViewer',
          data: { hypothesisId: 'H3', cw, ch, skipDueToZero: cw === 0 || ch === 0 },
          timestamp: Date.now(),
          runId: 'post-fix',
        }),
      }).catch(() => {});
      // #endregion
      if (cw === 0 || ch === 0) return;

      const $3Dmol = await wait3Dmol();
      if (!isMounted || !containerRef.current || viewerRef.current) return;
      // 再次檢查尺寸
      if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) return;

      viewerRef.current = $3Dmol.createViewer(containerRef.current, {
        backgroundColor: 0xffffff,
        backgroundAlpha: 0,
      });
    };

    if (containerRef.current) {
      observer = new ResizeObserver(() => {
        if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
          if (!viewerRef.current) {
            initViewer();
          } else {
            // 已建立則觸發 resize 更新
            viewerRef.current.resize();
          }
        }
      });
      observer.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
      if (viewerRef.current) {
        try {
           viewerRef.current.clear();
           viewerRef.current.removeAllModels();
        } catch (e) {
           console.warn("Viewer3D cleanup warning:", e);
        }
      }
      viewerRef.current = null;
      // 釋放 WebGL framebuffer，避免隱藏／零尺寸後 GL_INVALID_FRAMEBUFFER_OPERATION 與錯誤累積
      const el = containerRef.current;
      if (el) el.replaceChildren();
    };
  }, []);

  // 2. 資料更新：清空舊模型，加入新模型 (不重建 Canvas)
  useEffect(() => {
    let isMounted = true;
    const maxTicks = 200;
    let ticks = 0;

    // 定期確認 viewerRef.current 是否已由初次載入 Effect 建立完成
    const interval = setInterval(() => {
        ticks += 1;
        if (ticks > maxTicks) {
          clearInterval(interval);
          if (isMounted) setStatus('error');
          return;
        }
        if (!viewerRef.current) return;
        clearInterval(interval);
        if (!isMounted) return;

        const viewer = viewerRef.current;
        try { viewer.removeAllModels(); } catch { /* ignore */ }

        const applyStyle = () => {
          viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { radius: 0.3 } });
          viewer.zoomTo();
          viewer.spin('y', 0.5);
          const resizeAndRender = () => {
            try {
              viewer.resize();
            } catch {
              /* ignore */
            }
            try {
              viewer.render();
            } catch {
              /* ignore */
            }
          };
          resizeAndRender();
          // 避免首幀在版面／WebGL attachment 尚未就緒時 glClear 零尺寸 framebuffer
          requestAnimationFrame(() => {
            resizeAndRender();
            if (isMounted) setStatus('ready');
          });
        };

        if (cid) {
          fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`)
            .then(res => {
              // #region agent log
              fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '95c4aa' },
                body: JSON.stringify({
                  sessionId: '95c4aa',
                  location: 'Viewer3D.tsx:pubchem3d',
                  message: 'PubChem 3D SDF response',
                  data: { hypothesisId: 'H2', cid: String(cid), httpStatus: res.status, ok: res.ok },
                  timestamp: Date.now(),
                  runId: 'post-fix',
                }),
              }).catch(() => {});
              // #endregion
              if (!res.ok) throw new Error(`3D SDF: HTTP ${res.status}`);
              return res.text();
            })
            .then(sdf => {
              if (!isMounted) return;
              viewer.addModel(sdf, 'sdf');
              applyStyle();
            })
            .catch(() => {
              // 許多 CID 無 3D 構型，PubChem 回 404 屬正常，不刷 console.warn
              fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF`)
                .then(res => {
                  // #region agent log
                  fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '95c4aa' },
                    body: JSON.stringify({
                      sessionId: '95c4aa',
                      location: 'Viewer3D.tsx:pubchem2d',
                      message: 'PubChem 2D SDF response',
                      data: { hypothesisId: 'H2', cid: String(cid), httpStatus: res.status, ok: res.ok },
                      timestamp: Date.now(),
                      runId: 'post-fix',
                    }),
                  }).catch(() => {});
                  // #endregion
                  if (!res.ok) throw new Error(`2D SDF: HTTP ${res.status}`);
                  return res.text();
                })
                .then(sdf => {
                  if (!isMounted) return;
                  viewer.addModel(sdf, 'sdf');
                  applyStyle();
                })
                .catch(err2d => {
                  console.warn(`[Viewer3D] SDF 載入失敗 (CID ${cid})，改顯示 2D 圖`, err2d);
                  if (!isMounted) return;
                  if (fallbackImageUrl) {
                    setStatus('image_fallback');
                  } else {
                    setStatus('error');
                    setErrorMsg(`無法載入分子結構 (CID: ${cid})`);
                  }
                });
            });
        } else if (pdb) {
          try { viewer.addModel(pdb, 'pdb'); applyStyle(); } 
          catch (e) { setStatus('error'); setErrorMsg('PDB 資料格式錯誤'); }
        } else if (mol) {
          try { viewer.addModel(mol, 'mol'); applyStyle(); } 
          catch (e) { setStatus('error'); setErrorMsg('MOL 資料格式錯誤'); }
        } else {
          setStatus('error');
          setErrorMsg('未提供分子資料');
        }
    }, 100);

    return () => { 
       isMounted = false; 
       clearInterval(interval);
    };
  }, [cid, pdb, mol]);

  return (
    <div
      className={`relative w-full aspect-video min-h-[300px] max-w-md mx-auto bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden ${className}`}
    >
      {/* 3Dmol 容器：勿用 visibility:hidden，部分驅動在隱藏時 WebGL attachment 仍為 0×0 */}
      <div
        ref={containerRef}
        className={`absolute inset-0 z-0 ${status === 'ready' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        data-asea-will-read-frequently
        aria-hidden={status !== 'ready'}
      />

      {/* Loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-zinc-50/80 dark:bg-zinc-900/50">
          <svg className="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-xs font-medium">載入分子結構中...</span>
        </div>
      )}

      {/* 2D 圖片 Fallback */}
      {status === 'image_fallback' && fallbackImageUrl && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50">
          <img
            src={fallbackImageUrl}
            alt={`Compound CID ${cid} structure`}
            className="max-h-48 object-contain"
            onError={() => {
              setStatus('error');
              setErrorMsg(`無法載入分子結構 (CID: ${cid})`);
            }}
          />
          <span className="text-[10px] text-zinc-400 font-medium">2D 結構圖（3D 構型不可用）</span>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50">
          <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span className="text-xs text-center px-4">{errorMsg || '分子結構無法顯示'}</span>
        </div>
      )}
    </div>
  );
};

export default Viewer3D;
