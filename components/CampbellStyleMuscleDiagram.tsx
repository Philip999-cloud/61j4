
import React, { useEffect, useRef, useId } from 'react';
import katex from 'katex';
import Plotly from 'plotly.js-dist';

/**
 * ASEA STEM 視覺化升級原型 v2.0
 * 整合 KaTeX (智能修復), Plotly.js (正交投影 3D 引擎)，達成教科書級別的精準作圖。
 */
export default function CampbellStyleMuscleDiagram() {
  const matrixPlotId = useId().replace(/:/g, ''); 
  const funcPlotId = useId().replace(/:/g, ''); 
  const geomPlotId = useId().replace(/:/g, '');

  const latexRef1 = useRef<HTMLDivElement>(null);
  const latexRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ==========================================
    // 1. LaTeX 暴力修復器 (Ultimate Sanitizer)
    // ==========================================
    const sanitizeASEALaTeX = (rawString: string) => {
        let safeTex = rawString.trim();
        // 強力攔截：只要包含反斜線且沒有被 $ 包住，直接視為 Block Math
        // 能完美修復 \begin{bmatrix}, \Rightarrow, \frac 等漏網之魚
        if (safeTex.includes('\\') && !safeTex.startsWith('$') && !safeTex.startsWith('\\(') && !safeTex.startsWith('\\[')) {
            safeTex = `$$${safeTex}$$`;
        }
        return safeTex;
    };

    const rawNewMatrix = String.raw`\begin{bmatrix} r \\ s \end{bmatrix} = \begin{bmatrix} \frac{2}{3} & -\frac{\sqrt{5}}{3} \\ \frac{\sqrt{5}}{3} & \frac{2}{3} \end{bmatrix} \begin{bmatrix} x \\ y \end{bmatrix}`;
    const safeNewMatrix = sanitizeASEALaTeX(rawNewMatrix);
    const safeDetMatrix = sanitizeASEALaTeX(String.raw`\Rightarrow \overrightarrow{AE} = \left( \begin{vmatrix} -4 & -1 \\ -3 & -1 \end{vmatrix}, \begin{vmatrix} 1 & -1 \\ 3 & -1 \end{vmatrix}, \begin{vmatrix} 1 & -4 \\ 3 & -3 \end{vmatrix} \right) = \left( -\frac{2}{5}, \frac{8}{5}, \frac{2}{5} \right)`);

    const renderOptions = { throwOnError: false, displayMode: true, strict: false };

    if (latexRef1.current) katex.render(safeNewMatrix, latexRef1.current, renderOptions);
    if (latexRef2.current) katex.render(safeDetMatrix, latexRef2.current, renderOptions);

    // ==========================================
    // GeoGebra 質感核心配置 (專業化關鍵)
    // ==========================================
    const ggAxis = { 
        showgrid: true, gridwidth: 1, gridcolor: '#334155', // 深色模式細緻網格
        zeroline: true, zerolinewidth: 3, 
        showbackground: false, showline: false,
        tickfont: { color: '#94a3b8' }
    };

    // 正交投影 (Orthographic) - 消除透視變形
    const ggScene = {
        xaxis: { title: 'X', zerolinecolor: '#ef4444', ...ggAxis }, // 紅
        yaxis: { title: 'Y', zerolinecolor: '#22c55e', ...ggAxis }, // 綠
        zaxis: { title: 'Z', zerolinecolor: '#3b82f6', ...ggAxis }, // 藍
        camera: { 
            projection: { type: 'orthographic' }, // ！！！關鍵！！！
            eye: {x: 1.5, y: -1.5, z: 1.2} 
        },
        aspectmode: 'cube' as const
    };

    const mathLighting = { ambient: 0.6, diffuse: 0.8, roughness: 0.2, specular: 0.5, fresnel: 0.2 };

    // ==========================================
    // 2. 2D 矩陣旋轉 (保持透視，因為是 2D)
    // ==========================================
    const cosT = 2/3, sinT = Math.sqrt(5)/3;
    const v_initial = [3, 0];
    const v_transformed = [ v_initial[0]*cosT - v_initial[1]*sinT, v_initial[0]*sinT + v_initial[1]*cosT ];

    const vectorTraces: any[] = [
        {
            x: [0, v_initial[0]], y: [0, v_initial[1]],
            mode: 'lines+markers', line: {color: '#ef4444', width: 4}, marker: {size: 8, symbol: 'arrow-bar-up'}, name: '原向量'
        },
        {
            x: [0, v_transformed[0]], y: [0, v_transformed[1]],
            mode: 'lines+markers', line: {color: '#3b82f6', width: 4}, marker: {size: 8, symbol: 'arrow-bar-up'}, name: '轉換後'
        }
    ];

    // 旋轉軌跡弧線
    let arc_x = [], arc_y = [];
    const radius = 3;
    const angle = Math.atan2(v_transformed[1], v_transformed[0]);
    for(let i=0; i<=20; i++) {
        let t = (i/20) * angle;
        arc_x.push(radius * Math.cos(t));
        arc_y.push(radius * Math.sin(t));
    }
    vectorTraces.push({ x: arc_x, y: arc_y, mode: 'lines', line: {color: '#10b981', width: 2, dash: 'dot'}, name: '軌跡' });

    Plotly.newPlot(matrixPlotId, vectorTraces, {
        margin: { l: 30, r: 30, b: 30, t: 30 },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {range: [-1, 4], zerolinecolor: '#ef4444', ...ggAxis},
        yaxis: {range: [-1, 4], zerolinecolor: '#22c55e', scaleanchor: 'x', scaleratio: 1, ...ggAxis},
        showlegend: true, legend: {x: 0, y: 1, font: {color: '#cbd5e1'}, bgcolor: 'rgba(15, 23, 42, 0.8)'}
    }, {responsive: true, displayModeBar: false});

    // ==========================================
    // 3. 高精度 3D 函數 (正交投影 + 光影)
    // ==========================================
    let size = 60; // 高解析度
    let x_vals = [], y_vals = [], z_vals = [];
    for (let i = 0; i <= size; i++) {
        let x = -2.5 + (5 * i / size); x_vals.push(x);
        let row_y = [], row_z = [];
        for (let j = 0; j <= size; j++) {
            let y = -2.5 + (5 * j / size); row_y.push(y);
            row_z.push(x*x + y*y + 2);
        }
        if(i === 0) y_vals = row_y;
        z_vals.push(row_z);
    }

    Plotly.newPlot(funcPlotId, [{
        x: x_vals, y: y_vals, z: z_vals,
        type: 'surface', colorscale: 'YlOrBr', showscale: false, opacity: 0.95,
        lighting: mathLighting,
        contours: { z: { show: true, width: 1, color: 'rgba(0,0,0,0.2)' } } // 等高線紋理
    }], {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        scene: { ...ggScene, zaxis: {range: [0, 10], title: 'Z', zerolinecolor: '#3b82f6', ...ggAxis} }
    }, {responsive: true, displayModeBar: false});

    // ==========================================
    // 4. 立體幾何：角錐 (虛實線 + 半透明截面)
    // ==========================================
    const pts = { V:[0,0,3], A:[-2,-1.5,0], B:[2,-1.5,0], C:[0,2.5,0] };
    
    // 實線 (前面的邊 - Visible)
    const solidLines = {
        x: [pts.V[0], pts.A[0], pts.B[0], pts.V[0], pts.B[0]], 
        y: [pts.V[1], pts.A[1], pts.B[1], pts.V[1], pts.B[1]], 
        z: [pts.V[2], pts.A[2], pts.B[2], pts.V[2], pts.B[2]],
        type: 'scatter3d', mode: 'lines+markers',
        line: { color: '#be123c', width: 5 }, marker: { size: 4, color: '#0f172a' }, name: '可見邊'
    };
    
    // 虛線 (後面的隱藏邊 - Hidden)
    const dashedLines = {
        x: [pts.C[0], pts.A[0], null, pts.C[0], pts.B[0], null, pts.C[0], pts.V[0]], 
        y: [pts.C[1], pts.A[1], null, pts.C[1], pts.B[1], null, pts.C[1], pts.V[1]], 
        z: [pts.C[2], pts.A[2], null, pts.C[2], pts.B[2], null, pts.C[2], pts.V[2]],
        type: 'scatter3d', mode: 'lines',
        line: { color: '#94a3b8', width: 3, dash: 'dash' }, name: '隱藏邊'
    };
    
    // 半透明截面
    const filledFace = {
        x: [pts.V[0], pts.A[0], pts.B[0]], y: [pts.V[1], pts.A[1], pts.B[1]], z: [pts.V[2], pts.A[2], pts.B[2]],
        type: 'mesh3d', color: '#ef4444', opacity: 0.3, lighting: {ambient: 1}, name: '截面'
    };

    // 調整視角以完美呈現前後關係
    const pyramidScene = JSON.parse(JSON.stringify(ggScene));
    pyramidScene.camera.eye = {x: 1.2, y: -1.8, z: 0.5};

    Plotly.newPlot(geomPlotId, [dashedLines, filledFace, solidLines] as any, {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        scene: pyramidScene, showlegend: false
    }, {responsive: true, displayModeBar: false});

    return () => {
        try { Plotly.purge(matrixPlotId); } catch(e){}
        try { Plotly.purge(funcPlotId); } catch(e){}
        try { Plotly.purge(geomPlotId); } catch(e){}
    }
  }, [matrixPlotId, funcPlotId, geomPlotId]);

  return (
    <div className="w-full bg-[#0f172a] text-[#f8fafc] p-6 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="mb-8 border-b border-slate-700 pb-4">
            <h1 className="text-3xl font-bold text-blue-400 tracking-tight">ASEA 專業數學渲染引擎</h1>
            <p className="text-slate-400 mt-2">啟動「正交投影 (Orthographic)」與「高精度光影」，徹底消除透視變形，並解決殘留的 LaTeX 漏網之魚。</p>
        </header>

        {/* 區塊 1: LaTeX 暴力修復 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center">
                <span className="bg-emerald-500 w-2 h-6 rounded mr-3"></span>
                1. LaTeX 暴力修復 (解決 \Rightarrow 漏網之魚)
            </h2>
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 space-y-6">
                <div className="text-white text-xl overflow-x-auto" ref={latexRef1}></div>
                <div className="text-white text-lg overflow-x-auto" ref={latexRef2}></div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 區塊 2: 2D 矩陣 (保留教學價值) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:col-span-2 lg:col-span-1">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <span className="bg-blue-500 w-2 h-6 rounded mr-3"></span>
                    2. 數學聯動：矩陣旋轉
                </h2>
                <div
                  id={matrixPlotId}
                  data-asea-will-read-frequently
                  className="w-full h-80 rounded-lg overflow-hidden bg-white/5 shadow-inner"
                ></div>
            </div>

            {/* 區塊 3: 3D 函數 (正交投影) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-blue-400 mb-4 flex items-center">
                    <span className="bg-blue-500 w-2 h-6 rounded mr-3"></span>
                    3. 專業級 3D 函數 (正交投影 + 光影)
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                   使用 <code>orthographic</code> 視角與 <code>mesh3d</code> 光影，消除透視變形，呈現教科書級別的銳利拋物面。
                </p>
                <div
                  id={funcPlotId}
                  data-asea-will-read-frequently
                  className="w-full h-80 rounded-lg overflow-hidden bg-white/5 shadow-inner"
                ></div>
            </div>

            {/* 區塊 4: 立體幾何 (虛實線) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:col-span-2">
                <h2 className="text-xl font-semibold text-purple-400 mb-4 flex items-center">
                    <span className="bg-purple-500 w-2 h-6 rounded mr-3"></span>
                    4. 立體幾何：虛實線與半透明面
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                    精確區分「可見邊 (實線)」與「隱藏邊 (虛線)」，並為特定切面填上高級半透明材質。
                </p>
                <div
                  id={geomPlotId}
                  data-asea-will-read-frequently
                  className="w-full h-80 rounded-lg overflow-hidden bg-white/5 shadow-inner"
                ></div>
            </div>

        </div>
      </div>
    </div>
  );
}
