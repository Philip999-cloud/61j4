import React, { useEffect, useRef } from 'react';
import { SmilesRenderer } from './SmilesRenderer';

export const AcademicVisualCard: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
    if (!viewerRef.current) return;
    let cancelled = false;

    const init = async () => {
      let $3Dmol: any = (window as any).$3Dmol;
      if (!$3Dmol) {
        const start = Date.now();
        await new Promise<void>((resolve) => {
          const poll = setInterval(() => {
            if ((window as any).$3Dmol || Date.now() - start > 8000) { clearInterval(poll); resolve(); }
          }, 200);
        });
        $3Dmol = (window as any).$3Dmol;
      }
      if (!$3Dmol || cancelled || !viewerRef.current) return;

      // 動態偵測深淺模式以設定 3Dmol 背景色
      const isDark = document.documentElement.classList.contains('dark');
      const viewer = $3Dmol.createViewer(viewerRef.current, {
        backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
        antialias: true,
      });

      try {
        let sdfData: string | null = null;
        const res3d = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/6623/SDF?record_type=3d`);
        if (res3d.ok) { sdfData = await res3d.text(); }
        else {
          const res2d = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/6623/SDF`);
          if (res2d.ok) sdfData = await res2d.text();
        }
        if (cancelled) return;
        if (sdfData) {
          viewer.addModel(sdfData, 'sdf');
          viewer.setStyle({}, {
            stick:  { radius: 0.14, colorscheme: 'Jmol' },
            sphere: { radius: 0.40, colorscheme: 'Jmol' },
          });
          try { viewer.setViewStyle({ style: 'outline', color: isDark ? 'white' : 'black', width: 0.015 }); } catch { /* */ }
          viewer.zoomTo();
          viewer.zoom(0.9);
          viewer.rotate(50, 'y');
          viewer.rotate(15, 'x');
          viewer.render();
        } else {
          viewer.addLabel('Model not available (CID: 6623)', { position: {x:0,y:0,z:0}, backgroundColor: 'black', backgroundOpacity: 0.8, fontColor: 'white' });
          viewer.render();
        }
      } catch (err) {
        console.error('Failed to fetch 3D model for CID 6623:', err);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-4xl mx-auto my-10 bg-[var(--bg-card)] font-sans text-[var(--text-primary)] transition-colors duration-300">
      
      {/* 頂部：章節或主題標題 */}
      <div className="border-b-2 border-[var(--border-color)] pb-2 mb-6">
        <h2 className="text-xl font-bold font-sans tracking-wide">
          Ch 15. Stereochemistry and Molecular Symmetry
        </h2>
      </div>

      {/* 主圖解區域 (外框使用極細的單線條，模擬印刷品) */}
      <div className="border border-[var(--border-color)] relative h-[550px] bg-[var(--bg-card)] overflow-hidden transition-colors duration-300">
        
        {/* 左上角：化學正式 IUPAC 命名 */}
        <div className="absolute top-4 left-4 z-20 font-sans">
          <div className="text-lg font-bold text-[var(--text-primary)]">Bisphenol A (BPA)</div>
          <div className="text-xs text-[var(--text-secondary)] italic">4,4'-(Propane-2,2-diyl)diphenol</div>
        </div>

        {/* 核心 3D 畫布 */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div ref={viewerRef} className="w-[450px] h-[450px] relative z-20 cursor-move"></div>
          
          {/* 對稱面 (Plane of Symmetry, σ) - 改用冷峻的淡藍色/灰色調，帶有虛線邊框 */}
          <div 
            className="absolute w-0.5 h-72 bg-blue-400/20 shadow-[0_0_10px_rgba(96,165,250,0.3)] border-l border-dashed border-blue-500/50 z-30 pointer-events-none"
            style={{ transform: 'perspective(600px) rotateY(-40deg) rotateX(15deg) scaleX(30)' }}
          ></div>
        </div>

        {/* 學術指引線 (使用 currentColor 繼承文字顏色，確保深淺模式對比) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 font-sans text-[var(--text-primary)]">
          <defs>
            <marker id="tiny-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3">
              <circle cx="5" cy="5" r="5" fill="currentColor" />
            </marker>
          </defs>
          
          {/* Aromatic Ring 左 */}
          <polyline points="200,240 250,260" fill="none" stroke="currentColor" strokeWidth="1" markerStart="url(#tiny-dot)" />
          {/* Aromatic Ring 右 */}
          <polyline points="700,240 600,260" fill="none" stroke="currentColor" strokeWidth="1" markerStart="url(#tiny-dot)" />
          {/* Methyl Group */}
          <polyline points="425,110 425,200" fill="none" stroke="currentColor" strokeWidth="1" markerStart="url(#tiny-dot)" />
          {/* sp3 Carbon */}
          <polyline points="500,380 435,275" fill="none" stroke="currentColor" strokeWidth="1" markerStart="url(#tiny-dot)" />
          {/* Symmetry Plane */}
          <polyline points="560,140 460,180" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" markerStart="url(#tiny-dot)" />
        </svg>

        {/* 學術文字標籤 (使用 CSS 變數，確保深色模式可讀) */}
        <div className="absolute top-[230px] left-[130px] text-xs font-sans text-[var(--text-primary)]">
          <strong>芳香環</strong><br/>
          <span className="text-[10px] text-[var(--text-secondary)]">Phenolic ring</span>
        </div>
        <div className="absolute top-[230px] right-[130px] text-xs font-sans text-[var(--text-primary)]">
          <strong>芳香環</strong><br/>
          <span className="text-[10px] text-[var(--text-secondary)]">Phenolic ring</span>
        </div>
        <div className="absolute top-[85px] left-[390px] text-xs font-sans text-[var(--text-primary)] text-center">
          <strong>甲基</strong><br/>
          <span className="text-[10px] text-[var(--text-secondary)]">-CH₃ group</span>
        </div>
        <div className="absolute top-[385px] left-[460px] text-xs font-sans text-[var(--text-primary)]">
          <strong><i>sp³</i> 混成中央碳</strong><br/>
          <span className="text-[10px] text-[var(--text-secondary)]">Tetrahedral center</span>
        </div>
        <div className="absolute top-[125px] left-[565px] text-xs font-sans text-blue-600 dark:text-blue-400">
          <strong>對稱面 (<i className="font-serif">σ</i>)</strong><br/>
          <span className="text-[10px] text-blue-500/80 dark:text-blue-400/80">Plane of symmetry</span>
        </div>

        {/* 2D Skeletal Structure (使用 CSS 變數背景與邊框) */}
        <div className="absolute bottom-4 left-4 z-50 bg-[var(--bg-card)] p-2 border border-[var(--border-color)] transition-colors duration-300">
          <div className="text-[9px] font-sans font-bold text-[var(--text-primary)] mb-1 uppercase tracking-wider">
            Skeletal Structure
          </div>
          <div className="w-[160px] h-[90px] flex items-center justify-center">
             {/* 呼叫您現有的 SmilesRenderer，確保使用 light 主題 */}
            <SmilesRenderer smiles="CC(C)(c1ccc(O)cc1)c2ccc(O)cc2" width={150} height={80} theme="light" className="!border-0 !shadow-none !p-0" />
          </div>
        </div>
      </div>

      {/* 底部：學術標準的圖說 (Figure Caption) */}
      <div className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed font-serif text-justify transition-colors duration-300">
        <strong className="text-[var(--text-primary)]">Figure 1.2 | 雙酚 A (Bisphenol A) 的立體結構與分子對稱性。</strong> 
        本圖展示了由中央 <i>sp³</i> 混成碳原子所連接的兩個苯酚基團。雖然中央碳原子具有四面體幾何 (Tetrahedral geometry)，但由於分子具有一個內部對稱面 (Plane of symmetry, <i>σ</i>，如藍色虛切面所示)，該分子並不具備手性 (Achiral)。此幾何構型為理解高分子聚碳酸酯 (Polycarbonate) 的聚合反應提供了重要的空間位阻分析基礎。
      </div>

    </div>
  );
};

export default AcademicVisualCard;
