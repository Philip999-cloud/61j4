
import React, { useState, useEffect, useRef } from 'react';
import { SmartChart } from './SmartChart';
import Plotly from 'plotly.js-dist';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Viewer3D } from './Viewer3D';
import { fetchGeneratedImage } from '../geminiService';
import { ChemCompoundViewer } from './ChemCompoundViewer';
import { LatexRenderer } from './LatexRenderer';
import { TextWithChemistry } from './TextWithChemistry';
import { PhysicsRenderer } from './PhysicsRenderer';
import type { Compound } from '../types';
import { adaptiveSmoothTrace } from '../utils/curveSmoothing';
import { FreeBodyDiagram } from './physics/FreeBodyDiagram';

function isChemStoichiometryBlock(text: string): boolean {
  if (!text) return false;
  if (text.includes('\\begin') || text.includes('$$')) return false;
  return (
    (text.includes('↓') || text.includes('↑')) &&
    /^\s*[\d.]+/m.test(text) &&
    text.split('\n').length >= 3
  );
}

function renderStoichiometryBlock(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre style="
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85em;
    line-height: 1.7;
    background: transparent;
    margin: 0;
    padding: 0;
    white-space: pre;
    overflow-x: auto;
  ">${escaped}</pre>`;
}

export function SmartChemText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  const safeText = typeof text === 'string' ? text : String(text);

  if (isChemStoichiometryBlock(safeText)) {
    return (
      <div
        className={`overflow-x-auto ${className}`}
        dangerouslySetInnerHTML={{ __html: renderStoichiometryBlock(safeText) }}
      />
    );
  }

  return (
    <div className={className}>
      <TextWithChemistry content={safeText} />
    </div>
  );
}

interface VisualizationItem {
  type: 'recharts_plot' | 'svg_diagram' | 'plotly_chart' | 'nanobanan_image' | 'mol3d' | 'free_body_diagram';
  title?: string;
  caption?: string;
  chartType?: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
  xAxisLabel?: string;
  yAxisLabel?: string;
  data?: any[];
  layout?: any;
  svgCode?: string;
  config?: any; 
  prompt?: string;
  cid?: string;
  smiles?: string;
  pdb?: string;
  mol?: string;
  imageUrl?: string;
  forces?: { name: string; magnitude: number; angle: number }[];
  objectShape?: 'box' | 'circle' | 'dot';
}

interface VisualizationPayload {
  explanation?: string;
  visualizations?: VisualizationItem[];
  compounds?: Compound[];
}

const PLOTLY_TRACE_TYPES = new Set([
  'scatter', 'bar', 'line', 'pie', 'histogram', 'box', 'violin',
  'heatmap', 'contour', 'surface', 'mesh3d', 'scatter3d', 'scatterpolar',
  'waterfall', 'funnel', 'treemap', 'sunburst', 'sankey',
]);

const ROOT_VIZ_TYPES = new Set([
  'plotly_chart',
  'recharts_plot',
  'nanobanan_image',
  'mol3d',
  'svg_diagram',
  'free_body_diagram',
]);

/**
 * [VizRenderer] 傳入 content 防呆：空值、空物件、無 visualizations（且無其他可渲染根層欄位）→ 不掛載區塊
 */
function isVizRendererContentRenderable(content: any, compoundsProp?: Compound[]): boolean {
  if (content == null) return false;
  if (typeof content === 'string') {
    return content.trim().length > 0;
  }
  if (typeof content !== 'object' || Array.isArray(content)) return false;
  if (Object.keys(content).length === 0) return false;

  const v = content.visualizations;
  if (Array.isArray(v) && v.length > 0) return true;

  if (Array.isArray(content.compounds) && content.compounds.length > 0) return true;
  if (Array.isArray(compoundsProp) && compoundsProp.length > 0) return true;
  if (typeof content.svgCode === 'string' && content.svgCode.trim()) return true;
  if (content.cid != null && String(content.cid).trim() !== '') return true;
  if (typeof content.smiles === 'string' && content.smiles.trim()) return true;
  if (content.chartType) return true;
  const t = content.type;
  if (typeof t === 'string' && (PLOTLY_TRACE_TYPES.has(t) || ROOT_VIZ_TYPES.has(t))) return true;

  return false;
}

/** 解析後仍無任何圖表／化合物可畫（例如 Flash 降級回傳空壳）→ 不渲染區塊 */
function isParsedVisualizationPayloadRenderable(data: VisualizationPayload, compoundsProp?: Compound[]): boolean {
  const v = data.visualizations;
  if (Array.isArray(v) && v.length > 0) return true;
  if (Array.isArray(data.compounds) && data.compounds.length > 0) return true;
  if (Array.isArray(compoundsProp) && compoundsProp.length > 0) return true;
  return false;
}

// -------------------------------------------------------------------
// 繪圖引擎：注入 GeoGebra 風格
// -------------------------------------------------------------------
const normalizePlotlyData = (raw: any): any[] | null => {
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (typeof raw === 'object' && Array.isArray(raw.data)) return raw.data;
  if (typeof raw === 'object' && raw.x && raw.y) return [raw];
  return null;
};

const PlotlyChart: React.FC<{ data: any; layout?: any; title?: string }> = ({ data, layout, title }) => {
  const chartId = useRef(`plotly-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const traces = normalizePlotlyData(data);
    if (!traces || traces.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    
    // 🎨 GeoGebra 經典調色盤 (寶石藍、番茄紅、森林綠、橘、紫)
    const geoGebraColors = ['#1565C0', '#D32F2F', '#2E7D32', '#ED6C02', '#7B1FA2'];
    const axisColor = isDark ? '#d4d4d8' : '#27272a';
    const gridColor = isDark ? '#3f3f46' : '#e4e4e7';
    const zeroLineColor = isDark ? '#a1a1aa' : '#52525b';
    const plotBg = isDark ? '#18181b' : '#fafafa'; // 微灰白背景營造繪圖紙質感

    // 1. 強制強化 Data Traces 樣式 (加粗線條、加大點點)
    // ── Smart Spline Heuristic helpers ──
    /** 判斷首尾是否相連（閉合多邊形） */
    const isClosedShape = (xArr: any[], yArr: any[]): boolean => {
      if (!xArr || !yArr || xArr.length < 3) return false;
      const x0 = Number(xArr[0]), y0 = Number(yArr[0]);
      const xN = Number(xArr[xArr.length - 1]), yN = Number(yArr[yArr.length - 1]);
      if (isNaN(x0) || isNaN(y0) || isNaN(xN) || isNaN(yN)) return false;
      const dx = Math.abs(x0 - xN), dy = Math.abs(y0 - yN);
      // 使用資料範圍的 0.5% 作為容差
      const rangeX = Math.abs(Math.max(...xArr.map(Number).filter(n => !isNaN(n))) - Math.min(...xArr.map(Number).filter(n => !isNaN(n)))) || 1;
      const rangeY = Math.abs(Math.max(...yArr.map(Number).filter(n => !isNaN(n))) - Math.min(...yArr.map(Number).filter(n => !isNaN(n)))) || 1;
      return dx < rangeX * 0.005 && dy < rangeY * 0.005;
    };

    /** 計算頂點處的角度（度數），用於偵測銳角轉折 */
    const vertexAngleDeg = (px: number, py: number, cx: number, cy: number, nx: number, ny: number): number => {
      const v1x = px - cx, v1y = py - cy;
      const v2x = nx - cx, v2y = ny - cy;
      const dot = v1x * v2x + v1y * v2y;
      const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
      if (m1 === 0 || m2 === 0) return 180;
      return (Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180) / Math.PI;
    };

    /** 檢查資料點中是否存在銳角轉折（< threshold 度） */
    const hasSharpAngles = (xArr: any[], yArr: any[], threshold = 160): boolean => {
      const nums = xArr.map((v: any, i: number) => ({ x: Number(v), y: Number(yArr[i]) }));
      if (nums.some(p => isNaN(p.x) || isNaN(p.y))) return false;
      for (let i = 1; i < nums.length - 1; i++) {
        const angle = vertexAngleDeg(nums[i - 1].x, nums[i - 1].y, nums[i].x, nums[i].y, nums[i + 1].x, nums[i + 1].y);
        if (angle < threshold) return true;
      }
      return false;
    };

    /**
     * Smart Spline Heuristic：
     * - 閉合 + 點數少(< 10) + 有銳角 → 幾何多邊形 → 保持線性
     * - 其餘 → 函數曲線 → 套用平滑
     */
    const shouldSmoothTrace = (xArr: any[], yArr: any[]): boolean => {
      if (!Array.isArray(xArr) || !Array.isArray(yArr)) return false;
      const len = xArr.length;
      if (len < 3) return false;
      // 含有字串型 x（類別軸）→ 不平滑
      if (xArr.some((v: any) => typeof v === 'string') || yArr.some((v: any) => typeof v === 'string')) return false;
      // 資料點很多 → 幾乎一定是函數曲線
      if (len > 10) return true;
      // 少量點：若首尾閉合且有銳角 → 幾何多邊形
      if (isClosedShape(xArr, yArr) && hasSharpAngles(xArr, yArr)) return false;
      // 少量點但非閉合或無銳角 → 仍嘗試平滑
      return true;
    };

    const enhancedData = traces.map((trace: any, index: number) => {
        const newTrace = { ...trace };
        const defaultColor = geoGebraColors[index % geoGebraColors.length];

        // 若為散佈圖或折線圖
        if (newTrace.type === 'scatter') {
            // 線條渲染邏輯
            if (!newTrace.mode || newTrace.mode.includes('lines')) {
                if (Array.isArray(newTrace.x) && Array.isArray(newTrace.y) && newTrace.x.length > 2) {
                    if (shouldSmoothTrace(newTrace.x, newTrace.y)) {
                        // ✅ 函數曲線：自適應細分 + Plotly spline
                        const smoothed = adaptiveSmoothTrace(newTrace.x, newTrace.y);
                        newTrace.x = smoothed.x;
                        newTrace.y = smoothed.y;
                        newTrace.line = { ...newTrace.line, shape: 'spline', smoothing: 1 };
                    } else {
                        // ✅ 幾何多邊形：保持銳利直線
                        newTrace.line = { ...newTrace.line, shape: 'linear' };
                    }
                }

                // 線條加粗
                newTrace.line = {
                    width: 3, // GeoGebra 風格的粗實線
                    color: trace.line?.color || defaultColor,
                    ...trace.line,
                    ...newTrace.line
                };
            }
            // 標記點放大並加上白框 (更精緻的幾何點)
            if (newTrace.mode && newTrace.mode.includes('markers')) {
                newTrace.marker = {
                    size: 8,
                    color: trace.marker?.color || defaultColor,
                    line: { width: 1.5, color: isDark ? '#18181b' : '#ffffff' },
                    ...trace.marker
                };
            }
        }
        return newTrace;
    });
    
    // 2. GeoGebra 風格 Layout (帶有 Serif 數學字體與顯眼的十字軸)
    const defaultLayout = {
      title: title ? { 
          text: title, 
          font: { size: 16, color: axisColor, family: '"Cambria Math", "Times New Roman", serif' } 
      } : undefined,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: plotBg,
      font: { 
          color: axisColor, 
          family: '"Cambria Math", "Times New Roman", serif' // 全局數學字體
      },
      xaxis: { 
          gridcolor: gridColor,
          gridwidth: 1,
          zerolinecolor: zeroLineColor,
          zerolinewidth: 2.5, // 凸顯 X=0 十字軸
          showline: true, // 外框線
          linecolor: axisColor,
          linewidth: 1,
          ticks: 'outside',
          tickcolor: axisColor,
          mirror: true, // 形成完整的框
          automargin: true
      },
      yaxis: { 
          gridcolor: gridColor,
          gridwidth: 1,
          zerolinecolor: zeroLineColor,
          zerolinewidth: 2.5, // 凸顯 Y=0 十字軸
          showline: true,
          linecolor: axisColor,
          linewidth: 1,
          ticks: 'outside',
          tickcolor: axisColor,
          mirror: true,
          automargin: true
      },
      margin: { t: 50, r: 30, b: 50, l: 50 },
      showlegend: true,
      legend: { 
          orientation: 'h', 
          y: -0.15, 
          font: { family: 'ui-sans-serif, system-ui, sans-serif' } // 圖例保持現代字體易讀
      },
      autosize: true,
      hovermode: 'closest'
    };

    const mergedLayout = { ...defaultLayout, ...layout };
    
    // 保留 AI 若有設定特定的 Scale Anchor (例如 1:1 幾何比例)
    if (layout?.xaxis?.scaleanchor) {
        mergedLayout.xaxis = { ...mergedLayout.xaxis, ...layout.xaxis };
    }

    const config = { 
        responsive: true, 
        displayModeBar: true, // 允許使用者縮放平移
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    try {
        Plotly.newPlot(chartId.current, enhancedData, mergedLayout, config);
    } catch (e) {
        console.error("Plotly Render Error:", e);
    }

    return () => {
      try {
        Plotly.purge(chartId.current);
      } catch (e) { /* ignore */ }
    };
  }, [data, layout, title]);

  return <div id={chartId.current} className="w-full h-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800" style={{ minHeight: '350px' }} />;
};

// 透過 SVGR，我們將具有 ID Tags 的 SVG 當作一個 React Component 引入
// 因為檔案可能很多，這裡做一個動態映射表或在展示上使用靜態組件
import HeartAnatomy from '../src/assets/biology/heart.svg?react';

// ── SVG 錯誤邊界：防止 SVG 載入失敗時整頁 Crash（白畫面）──
class SvgErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackLabel?: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallbackLabel?: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[SvgErrorBoundary] SVG 渲染失敗:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-400">
          <ImageIcon className="w-10 h-10 opacity-40" />
          <span className="text-xs">{this.props.fallbackLabel || '圖形載入失敗'}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export const InteractiveAnatomyViewer: React.FC<{ vizData: any }> = ({ vizData }) => {
  // 假設 AI 透過 vizData.highlightId 告訴前端現在講到哪裡，例如 "left-ventricle"
  // 若未提供，可以假設 prompt 就是標的
  const targetId = vizData.highlightId || vizData.prompt;

  return (
    <div className="bg-slate-900 rounded-[1.5rem] p-6 shadow-xl border border-slate-700">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        {vizData.title || '精準解剖互動圖'}
      </h3>
      {/* 透過 CSS 配合 AI 傳來的 ID 進行高亮控制 */}
      <style>
        {`
          /* 預設讓所有器官半透明或呈現底色 */
          svg path, svg g {
            transition: all 0.5s ease;
          }
          /* 當有選中目標時，讓非目標器官變暗 */
          ${targetId ? `svg g:not(#${targetId}) { opacity: 0.3; }` : ''}
          
          /* 被 AI 點名的 ID 結構，精準亮起並改變顏色 */
          svg #${targetId} path, svg #${targetId} {
            fill: #ef4444 !important; /* 紅色高亮 */
            stroke: #fca5a5 !important;
            stroke-width: 2px !important;
            filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
          }
        `}
      </style>
      
      {/* 直接渲染 SVG DOM */}
      <div className="w-full max-w-md mx-auto flex justify-center items-center">
        {/* 動態展示策略：若未來有多圖，可寫 switch case，此處以心臟為核心示範 */}
        <SvgErrorBoundary fallbackLabel="心臟解剖圖載入失敗">
          <HeartAnatomy className="w-full h-auto max-h-64 object-contain text-[var(--text-primary)]" />
        </SvgErrorBoundary>
      </div>
      
      {targetId && (
        <div className="mt-6 text-center text-red-400 font-bold bg-red-500/10 py-2 px-4 rounded-full border border-red-500/20 inline-block mx-auto">
          🎯 AI 焦點追蹤：{vizData.targetName || targetId}
        </div>
      )}
    </div>
  );
};

export const VisualizationRenderer: React.FC<{ content: any; compounds?: Compound[] }> = ({ content, compounds: compoundsProp }) => {
  const [parsedData, setParsedData] = useState<VisualizationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVizRendererContentRenderable(content, compoundsProp)) {
      setParsedData(null);
      setError(null);
      return;
    }
    if (!content) return;

    setParsedData(null);
    setError(null);

    let parsed: any = null;
    let cleanCode = typeof content === 'string' ? content.trim() : '';

    if (typeof content === 'object') {
        parsed = content;
    } else {
        // Robust cleanup for string inputs (fallback legacy)
        cleanCode = cleanCode.replace(/```json\n?|```/gi, '');
        cleanCode = cleanCode.replace(/[\u200B-\u200D\uFEFF]/g, ''); 

        const startIdx = cleanCode.indexOf('{');
        const endIdx = cleanCode.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
            cleanCode = cleanCode.substring(startIdx, endIdx + 1);
        }

        try {
            parsed = JSON.parse(cleanCode);
        } catch (e1) {
             // Robust Sanitization / Recovery Path
             try {
                // Step A: Protect valid escaped quotes \"
                const quotePlaceholder = "___QUOTE_PLACEHOLDER___";
                let processing = cleanCode.replace(/\\"/g, quotePlaceholder);
                
                // Step B: Double ALL remaining backslashes
                processing = processing.replace(/\\/g, '\\\\');
                
                // Step C: Restore protected quotes
                processing = processing.replace(new RegExp(quotePlaceholder, 'g'), '\\"');
                
                // Step D: Handle Literal Newlines and carriage returns
                processing = processing.replace(/\n/g, " ").replace(/\r/g, "");

                // Step E: Relaxed JSON key quoting if necessary
                processing = processing.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');
                
                // Step F: Remove trailing commas
                processing = processing.replace(/,\s*([}\]])/g, '$1');

                parsed = JSON.parse(processing);
             } catch(e3) {
                 console.error("Visualization Parsing Failed", e3);
                 if (cleanCode.startsWith('{') || cleanCode.includes('def ') || cleanCode.includes('import ')) {
                     setError("圖表資料格式錯誤，無法顯示");
                     parsed = null;
                 } else {
                     parsed = { explanation: cleanCode, visualizations: [] };
                 }
            }
        }
    }

    if (parsed) {
       // ✅ Fix: AI 有時回傳 Plotly trace 的 type（如 "scatter"）而非 "plotly_chart"
       if (
         parsed.type &&
         PLOTLY_TRACE_TYPES.has(parsed.type) &&
         (parsed.x || parsed.y || parsed.z) &&
         parsed.type !== 'mol3d' &&
         parsed.cid == null &&
         !parsed.smiles
       ) {
         setParsedData({
           explanation: parsed.explanation,
           compounds: parsed.compounds,
           visualizations: [{
             type: 'plotly_chart',
             title: parsed.title || parsed.name || 'Chart',
             caption: parsed.caption,
             data: [parsed],
             layout: parsed.layout,
           }],
         });
         return;
       }

       // ✅ Fix: visualization_code 裡的 visualizations 陣列中的 trace 也要處理
       if (parsed.visualizations && Array.isArray(parsed.visualizations)) {
         parsed.visualizations = parsed.visualizations.map((viz: any) => {
           // mol3d 在 schema 下可能帶有空的 x/y 陣列，不可當 Plotly trace 轉換
           if (viz.type === 'mol3d' || viz.cid != null || viz.smiles) {
             return viz;
           }
           if (viz.type && PLOTLY_TRACE_TYPES.has(viz.type) && (viz.x || viz.y || viz.z)) {
             return {
               type: 'plotly_chart',
               title: viz.title || viz.name || 'Chart',
               caption: viz.caption,
               data: [viz],
               layout: viz.layout,
             };
           }
           return viz;
         });
       }

       // Normalize single visualization items to array format
       if (parsed.type === 'visualization' || parsed.chartType || parsed.type === 'plotly_chart' || parsed.type === 'recharts_plot' || parsed.type === 'nanobanan_image' || parsed.type === 'mol3d' || parsed.type === 'free_body_diagram' || parsed.cid || parsed.smiles) {
           // Direct visualization object detected
           const type = parsed.type === 'plotly_chart' ? 'plotly_chart' : 
                        parsed.type === 'svg_diagram' ? 'svg_diagram' : 
                        parsed.type === 'nanobanan_image' ? 'nanobanan_image' : 
                        parsed.type === 'free_body_diagram' ? 'free_body_diagram' :
                        (parsed.type === 'mol3d' || parsed.cid || parsed.smiles) ? 'mol3d' : 'recharts_plot';
           
           let vizItem: any = { ...parsed, type };
           // plotly_chart: 解開巢狀 { data: [...], layout: {...} }
           if (type === 'plotly_chart') {
             const raw = vizItem.data || parsed.data;
             if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
               if (Array.isArray(raw.data)) { vizItem.data = raw.data; if (raw.layout) vizItem.layout = raw.layout; }
               else if (raw.x && raw.y) { vizItem.data = [raw]; }
             }
             if (!vizItem.layout && parsed.layout) vizItem.layout = parsed.layout;
           }
           
           setParsedData({ 
               explanation: parsed.explanation, 
               visualizations: [vizItem],
               compounds: parsed.compounds
           });
       } else if (parsed.svgCode) {
           // Fallback if AI forgets the 'visualizations' array but provides svgCode
           setParsedData({
               explanation: parsed.explanation,
               visualizations: [{ type: 'svg_diagram', svgCode: parsed.svgCode, title: parsed.title || 'Diagram' }],
               compounds: parsed.compounds
           });
       } else {
           setParsedData(parsed);
       }
    }
  }, [content, compoundsProp]);

  if (!isVizRendererContentRenderable(content, compoundsProp)) {
    return null;
  }

  if (error) {
      return (
         <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-sm font-bold flex items-center gap-2 mt-4 text-red-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
         </div>
      );
  }
  
  if (!parsedData) return null;

  if (!isParsedVisualizationPayloadRenderable(parsedData, compoundsProp)) {
    return null;
  }

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {parsedData.explanation && (
        <div className="bg-indigo-500/5 border-l-2 border-indigo-500 pl-4 py-2">
           <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Visual Reasoning</h5>
           <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
             <SmartChart data={{ type: 'text_only', chartType: 'line', title: '', data: [], explanation: parsedData.explanation }} renderExplanationOnly={true} />
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {parsedData.visualizations?.map((viz, idx) => {
          if (!viz) return null;
          try {
            if (viz.type === 'plotly_chart') {
              return (
                <div key={idx} className="bg-white dark:bg-zinc-950/40 p-4 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="mb-2 flex justify-between items-center px-2">
                       <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>{viz.title || 'Mathematical Model'}</h5>
                    </div>
                    <PlotlyChart data={viz.data} layout={viz.layout} title={viz.title} />
                    {viz.caption && <div className="mt-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg"><p className="text-zinc-500 text-xs text-center font-serif italic">{viz.caption}</p></div>}
                </div>
              );
            }
            if (viz.type === 'recharts_plot') {
              return <SmartChart key={idx} data={{ 
                  type: 'visualization', 
                  chartType: viz.chartType || 'line', 
                  title: viz.title || 'Chart', 
                  xAxisLabel: viz.xAxisLabel, 
                  yAxisLabel: viz.yAxisLabel, 
                  data: viz.data || [], 
                  explanation: viz.caption,
                  config: viz.config
              }} />;
            } 
            if (viz.type === 'svg_diagram' && viz.svgCode) {
              return (
                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-[1.5rem] border border-zinc-200 shadow-xl overflow-hidden group">
                  <div className="mb-2 flex justify-between items-center px-2">
                       <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>{viz.title || 'Diagram'}</h5>
                  </div>
                  <div className="flex justify-center bg-white dark:bg-gray-800 rounded-xl overflow-x-auto max-w-full relative" style={{ minHeight: '200px' }}><PhysicsRenderer svgCode={viz.svgCode} className="svg-content" /></div>
                  {viz.caption && <div className="mt-3 px-4 py-2 bg-zinc-50 rounded-lg"><p className="text-zinc-500 text-xs text-center font-serif italic">{viz.caption}</p></div>}
                </div>
              );
            }
            if (viz.type === 'mol3d' || viz.cid || viz.smiles) {
              return (
                <div key={idx} className="bg-white dark:bg-zinc-950/40 p-4 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="mb-2 flex justify-between items-center px-2">
                       <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{viz.title || '3D Molecular Model'}</h5>
                    </div>
                    <Viewer3D cid={viz.cid} smiles={viz.smiles} pdb={viz.pdb} mol={viz.mol} />
                    {viz.caption && <div className="mt-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg"><p className="text-zinc-500 text-xs text-center font-serif italic">{viz.caption}</p></div>}
                </div>
              );
            }
            if (viz.type === 'nanobanan_image' && viz.prompt) {
              return <InteractiveAnatomyViewer key={idx} vizData={viz} />;
            }
            if (viz.type === 'free_body_diagram' && viz.forces) {
               return <FreeBodyDiagram key={idx} forces={viz.forces} objectShape={viz.objectShape} />;
            }
            return null;
          } catch (error) {
            console.error('[Grading Fatal Error]', error, '\nPayload:', viz);
            return null;
          }
        })}
      </div>

      {/* 化學科專用：批改完後顯示化合物結構式與 3D 模型 */}
      {(parsedData.compounds ?? compoundsProp) && (parsedData.compounds ?? compoundsProp)!.length > 0 && (
        <ChemCompoundViewer compounds={parsedData.compounds ?? compoundsProp!} />
      )}
    </div>
  );
};
