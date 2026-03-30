
import React, { useState, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import { SmartChart } from './SmartChart';
import Plotly from 'plotly.js-dist';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Viewer3D } from './Viewer3D';
import { fetchGeneratedImage } from '../geminiService';
import { ChemCompoundViewer } from './ChemCompoundViewer';
import { LatexRenderer } from './LatexRenderer';
import { TextWithChemistry } from './TextWithChemistry';
import { SmartSvg } from './SmartSvg';
import type { Compound } from '../types';
import { adaptiveSmoothTrace } from '../utils/curveSmoothing';
import { patchStem3dPlotlyTraces } from '../utils/plotlyStem3dPatch';
import { patchPhysics3dTraces } from '../utils/plotlyPhysics3dPatch';
import { FreeBodyVectorDiagram } from './visualizations/FreeBodyVectorDiagram';
import { InclinedPlaneFbd } from './physics/InclinedPlaneFbd';
import { CollisionDiagram, type CollisionParams } from './physics/CollisionDiagram';
import { PhysiologyMechanismDiagram, type PhysiologyLayer } from './physiology/PhysiologyMechanismDiagram';
import { PythonFunctionPlotBlock } from './PythonFunctionPlotBlock';
import { AseaRenderBlock } from './AseaRenderBlock';
import {
  isAseaRenderVizItem,
  isInclinedPlaneFbdViz,
  parseInclinedPlanePayload,
} from '../utils/aseaVizDsl';
import { geometryJsonToSvg } from '@/src/utils/geometryToSvg';
import type { GeometryJSON } from '@/src/types/geometry';
import {
  isRegularPolygonSolverPayload,
  solverModePayloadToGeometryJSON,
} from '@/src/utils/topologyResolver';
import { normalizePythonPlotViz } from '../utils/normalizePythonPlotViz';
import { ChemAromaticRingDiagram } from './visualizations/ChemAromaticRingDiagram';
import { WaveInterferenceSvg } from './visualizations/WaveInterferenceSvg';
import { SnellLawDiagram } from './visualizations/SnellLawDiagram';
import { StemXYChart } from './visualizations/StemXYChart';
import { CircuitSchematicSvg } from './visualizations/CircuitSchematicSvg';
import { ChemSmiles2DWithLonePairs } from './visualizations/ChemSmiles2DWithLonePairs';
import { PunnettSquare } from './visualizations/PunnettSquare';
import { PedigreeChart } from './visualizations/PedigreeChart';
import { MermaidFlowchart } from './visualizations/MermaidFlowchart';
import { CelestialGeometryDiagram } from './visualizations/CelestialGeometryDiagram';
import { ContourMapSvg } from './visualizations/ContourMapSvg';
import { TitrationCurveChart } from './visualizations/TitrationCurveChart';
import { EnergyLevelDiagram } from './visualizations/EnergyLevelDiagram';
import { PeriodicTableHighlights } from './visualizations/PeriodicTableHighlights';
import {
  parsePhase3ChemAromatic,
  parsePhase3Snell,
  parsePhase3StemXY,
  parsePhase3WaveInterference,
  parseCircuitSchematic,
  parseChemSmiles2D,
  parsePunnettSquare,
  parsePedigree,
  parseMermaidFlowchart,
  parseEarthCelestial,
  parseEarthContour,
  parseTitrationCurve,
  parseFreeBodyForces,
  parseEnergyLevelDiagram,
  parsePeriodicTableHighlight,
} from '../utils/phase3VizPayload';
import {
  coercePlotlyDataJsonIfString,
  filterRenderableVisualizations,
  geometryJsonItemRenderable,
  plotlyDataLooksRenderable,
  validateVisualizationItem,
  visualizationMol3dLoadable,
} from '../utils/validateStemVisualization';

/** 與 filterRenderableVisualizations 一致，避免 gate 與實際過濾結果不同步 */
function vizListItemIsRenderable(item: unknown): boolean {
  return validateVisualizationItem(item).valid;
}

function stableStringifyForVizFingerprint(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** STEM visualizations[] 各區塊避免僅用 idx 導致列表變動時實例錯接 */
function stemVizItemReactKey(vizType: string, idx: number, viz: unknown): string {
  const fp = stableStringifyForVizFingerprint(viz);
  const slice = fp.length <= 100 ? fp : fp.slice(0, 100);
  return `${vizType}-${idx}-${slice}`;
}

function subscribeHtmlDarkClass(onStoreChange: () => void): () => void {
  const el = document.documentElement;
  const obs = new MutationObserver(() => onStoreChange());
  obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}

function getHtmlDarkClassSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function getHtmlDarkClassServerSnapshot(): boolean {
  return false;
}

function vizRawHadFreeBodyDiagram(raw: unknown[] | undefined | null): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some(
    (x) =>
      x &&
      typeof x === 'object' &&
      !Array.isArray(x) &&
      (x as { type?: string }).type === 'free_body_diagram',
  );
}

/** 說明像在描述受力圖，但模型未給可解析的 forces[] 時，提供保守示意圖 */
function explanationSuggestsFbdFallback(explanation: string): boolean {
  const t = explanation.trim();
  if (t.length < 4) return false;
  return (
    /受力|正向力|法向力|摩擦力|彈力|張力|支撐力|靜力平衡|靜力|free\s*body|FBD/i.test(t) &&
    (/力圖|分析圖|向量|箭頭|方向|顯示|示意/i.test(t) || /摩擦|正向|法向/.test(t))
  );
}

function buildFbdFallbackFromExplanation(
  explanation: string,
  rawVisualizations: unknown[] | undefined | null,
): VisualizationItem | null {
  if (!explanationSuggestsFbdFallback(explanation)) return null;
  const hadTypedFbd = vizRawHadFreeBodyDiagram(rawVisualizations);
  const narrativeDiagram =
    /力圖|分析圖|顯示[^。]*方向|受力分析/.test(explanation);
  if (!hadTypedFbd && !narrativeDiagram) return null;
  return {
    type: 'free_body_diagram',
    title: '受力示意（對照說明）',
    caption: '向量方向配合題述示意；長度非實際數值比。',
    forces: [
      { name: 'N', magnitude: 1, angle: 90 },
      { name: 'mg', magnitude: 1.2, angle: 270 },
      { name: 'f', magnitude: 0.8, angle: 180 },
    ],
    objectShape: 'box',
  } as VisualizationItem;
}

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
  type:
    | 'recharts_plot'
    | 'svg_diagram'
    | 'plotly_chart'
    | 'nanobanan_image'
    | 'mol3d'
    | 'free_body_diagram'
    | 'python_plot'
    | 'python_script'
    | 'physics_collision'
    | 'physiology_mechanism'
    | 'asea_render'
    | 'chemistry_2d'
    | 'geometry_json'
    | 'image_description'
    | 'matplotlib'
    | 'chem_aromatic_ring'
    | 'physics_wave_interference'
    | 'physics_snell_diagram'
    | 'stem_xy_chart'
    | 'titration_curve'
    | 'circuit_schematic'
    | 'chem_smiles_2d_lone_pairs'
    | 'biology_punnett_square'
    | 'biology_pedigree'
    | 'mermaid_flowchart'
    | 'earth_celestial_geometry'
    | 'earth_contour_map'
    | 'energy_level_diagram'
    | 'periodic_table_highlight';
  title?: string;
  caption?: string;
  chartType?: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** 圖表為陣列；asea_render / chemistry_2d 等為物件 */
  data?: any;
  layout?: any;
  svgCode?: string;
  /** 部分模型誤用 code 承載 SVG 或 python_script 本體 */
  code?: string;
  config?: any;
  prompt?: string;
  cid?: string;
  smiles?: string;
  pdb?: string;
  mol?: string;
  imageUrl?: string;
  forces?: { name: string; magnitude: number; angle: number }[];
  objectShape?: 'box' | 'circle' | 'dot';
  /** python_plot：Matplotlib 沙箱（向量 SVG） */
  func_str?: string;
  x_range?: [number, number];
  y_range?: [number, number];
  plot_mode?: '3d' | '2d';
  /** 預算好的 SVG（與後端 /api/python-plot 回傳一致） */
  svg?: string;
  /** physics_collision */
  parameters?: CollisionParams;
  /** physiology_mechanism */
  category?: string;
  topic?: string;
  layers?: PhysiologyLayer[];
  visual_style?: string;
  interaction_enabled?: boolean;
  /** asea_render / chemistry_2d DSL（與圖表 traces 的 data 並存時以型別寬鬆處理） */
  engine?: string;
  styling?: Record<string, unknown>;
  apply_layout?: boolean;
  /** Phase 3：chem_aromatic_ring / stem_xy_chart 等 */
  ring?: 'benzene' | 'pyridine';
  lone_pair_on_vertices?: number[];
  phase_offset_rad?: number;
  amplitude?: number;
  n1?: number;
  n2?: number;
  incident_deg?: number;
  refracted_deg?: number;
  chart_kind?: 'line' | 'scatter';
  x?: number[];
  y?: number[];
  x_axis_title?: string;
  y_axis_title?: string;
}

interface VisualizationPayload {
  explanation?: string;
  visualizations?: VisualizationItem[];
  compounds?: Compound[];
}

const PLOTLY_TRACE_TYPES = new Set([
  'scatter',
  'scattergl',
  'bar',
  'line',
  'pie',
  'histogram',
  'box',
  'violin',
  'heatmap',
  'contour',
  'surface',
  'mesh3d',
  'scatter3d',
  'scatterpolar',
  'waterfall',
  'funnel',
  'treemap',
  'sunburst',
  'sankey',
  'volume',
  'cone',
  'isosurface',
]);

const ROOT_VIZ_TYPES = new Set([
  'plotly_chart',
  'recharts_plot',
  'nanobanan_image',
  'mol3d',
  'svg_diagram',
  'geometry_json',
  'free_body_diagram',
  'asea_render',
  'chemistry_2d',
  'chem_aromatic_ring',
  'physics_wave_interference',
  'physics_snell_diagram',
  'stem_xy_chart',
  'titration_curve',
  'circuit_schematic',
  'chem_smiles_2d_lone_pairs',
  'biology_punnett_square',
  'biology_pedigree',
  'mermaid_flowchart',
  'earth_celestial_geometry',
  'earth_contour_map',
  'energy_level_diagram',
  'periodic_table_highlight',
]);

function isGeometryJsonVizRenderable(item: { type?: string; code?: unknown }): boolean {
  if (item.type !== 'geometry_json') return false;
  const c = item.code;
  if (typeof c === 'string' && c.trim().length > 0) return true;
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    if (isRegularPolygonSolverPayload(c)) return true;
    if (
      typeof (c as GeometryJSON).shape_type === 'string' &&
      Array.isArray((c as GeometryJSON).vertices)
    ) {
      return true;
    }
  }
  return false;
}

function visualizationPayloadHasGeometryJson(payload: VisualizationPayload | null | undefined): boolean {
  return !!payload?.visualizations?.some((v) => v?.type === 'geometry_json');
}

function isNonSvgGeometryVizType(t: string | undefined): boolean {
  /** python_script 為合法備援圖示，不應與 geometry_json 並列時被當成「錯誤幾何」攔截 */
  return t === 'image_description' || t === 'matplotlib';
}

function shouldStrictInterceptGeometryViz(
  payload: VisualizationPayload | null | undefined,
  onRetryExtraction?: (() => void) | undefined,
  allowPrefetchedGeometryFallback?: boolean,
): boolean {
  if (visualizationPayloadHasGeometryJson(payload)) return true;
  /** 僅數學門啟用題目圖幾何後備；化學等科仍傳 onRetry 但不應攔截合法的 python_script／plotly 等 */
  return !!allowPrefetchedGeometryFallback && typeof onRetryExtraction === 'function';
}

type VizPrefetchGateOpts = {
  allowPrefetchedGeometryFallback?: boolean;
  prefetchedGeometryJson?: GeometryJSON | null;
};

/** 模型偶將 SVG 包在 markdown fence；供 svg_diagram 檢查與進 SmartSvg 前剝除 */
function normalizeSvgDiagramMarkup(raw: string | null | undefined): string {
  let s = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  if (!s) return '';
  s = s.replace(/^```(?:svg|html|xml)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return s;
}

/**
 * [VizRenderer] 傳入 content 防呆：空值、空物件、無 visualizations（且無其他可渲染根層欄位）→ 不掛載區塊
 */
function isVizRendererContentRenderable(
  content: any,
  compoundsProp?: Compound[],
  prefetchOpts?: VizPrefetchGateOpts,
): boolean {
  if (content == null) return false;
  if (typeof content === 'string') {
    return content.trim().length > 0;
  }
  if (typeof content !== 'object' || Array.isArray(content)) return false;
  if (Object.keys(content).length === 0) return false;

  const v = content.visualizations;
  if (Array.isArray(v) && v.length > 0) {
    if (v.some((item: unknown) => vizListItemIsRenderable(item))) return true;
    /** 模型已送 visualizations 但 strict 驗證全滅：仍掛載，讓內層 lenient／題幹幾何後備有機會畫圖 */
    return true;
  }

  if (Array.isArray(content.compounds) && content.compounds.length > 0) return true;
  if (Array.isArray(compoundsProp) && compoundsProp.length > 0) return true;
  if (typeof content.svgCode === 'string' && content.svgCode.trim()) return true;
  if (content.cid != null && String(content.cid).trim() !== '') return true;
  if (typeof content.smiles === 'string' && content.smiles.trim()) return true;
  if (content.chartType) return true;
  if (content.type === 'plotly_chart') {
    return plotlyDataLooksRenderable(content.data);
  }
  const t = content.type;
  if (typeof t === 'string' && (PLOTLY_TRACE_TYPES.has(t) || ROOT_VIZ_TYPES.has(t))) return true;

  if (content.type === 'geometry_json') {
    return isGeometryJsonVizRenderable(content);
  }

  if (content.type === 'python_plot') {
    const svgPre =
      (typeof content.svgCode === 'string' && content.svgCode.trim()) ||
      (typeof content.svg === 'string' && content.svg.trim());
    const xr = content.x_range;
    const yr = content.y_range;
    const hasRanges =
      Array.isArray(xr) && xr.length === 2 && Array.isArray(yr) && yr.length === 2;
    const hasFunc = typeof content.func_str === 'string' && content.func_str.trim().length > 0;
    if (svgPre || (hasFunc && hasRanges)) return true;
  }
  if (
    content.type === 'python_script' &&
    typeof content.code === 'string' &&
    content.code.trim().length > 0
  ) {
    return true;
  }
  if (content.type === 'svg_diagram') {
    const s = normalizeSvgDiagramMarkup(
      (typeof content.svgCode === 'string' && content.svgCode.trim()) ||
        (typeof content.code === 'string' && content.code.trim()) ||
        '',
    );
    return !!s;
  }
  if (
    content.type === 'physics_collision' &&
    content.parameters?.ball_A &&
    content.parameters?.ball_B
  ) {
    return true;
  }
  if (
    content.type === 'physiology_mechanism' &&
    (typeof content.topic === 'string' || (Array.isArray(content.layers) && content.layers.length > 0))
  ) {
    return true;
  }
  if (
    content.category === 'Physiology' &&
    Array.isArray(content.layers) &&
    content.layers.length > 0
  ) {
    return true;
  }

  if (isAseaRenderVizItem(content)) return true;
  if (isInclinedPlaneFbdViz(content)) return true;
  if (content.type === 'chemistry_2d' && content.data && typeof content.data === 'object' && !Array.isArray(content.data)) {
    const ms = (content.data as Record<string, unknown>).molecule_string;
    if (typeof ms === 'string' && ms.trim()) return true;
  }

  if (typeof content.explanation === 'string' && content.explanation.trim().length > 0) {
    return true;
  }
  if (
    prefetchOpts?.allowPrefetchedGeometryFallback &&
    prefetchOpts.prefetchedGeometryJson != null &&
    geometryJsonItemRenderable({
      type: 'geometry_json',
      code: prefetchOpts.prefetchedGeometryJson,
    })
  ) {
    return true;
  }

  return false;
}

/** 解析後仍無任何圖表／化合物可畫（例如 Flash 降級回傳空壳）→ 不渲染區塊 */
function isParsedVisualizationPayloadRenderable(data: VisualizationPayload, compoundsProp?: Compound[]): boolean {
  const v = data.visualizations;
  if (Array.isArray(v) && v.length > 0) {
    if (v.some((item: unknown) => vizListItemIsRenderable(item))) return true;
  }
  if (Array.isArray(data.compounds) && data.compounds.length > 0) return true;
  if (Array.isArray(compoundsProp) && compoundsProp.length > 0) return true;
  return false;
}

/** mol3d 區塊僅在具備 PubChem／SMILES／結構資料時可交給 Viewer3D */
function mol3dVizHasLoadableStructure(viz: VisualizationItem | null | undefined): boolean {
  if (!viz || typeof viz !== 'object') return false;
  return visualizationMol3dLoadable(viz as unknown as Record<string, unknown>);
}

function isParsedPayloadDisplayable(
  data: VisualizationPayload | null,
  compoundsProp?: Compound[],
  prefetchOpts?: VizPrefetchGateOpts,
): boolean {
  if (!data) return false;
  if (isParsedVisualizationPayloadRenderable(data, compoundsProp)) return true;
  if (typeof data.explanation === 'string' && data.explanation.trim().length > 0) return true;
  if (
    prefetchOpts?.allowPrefetchedGeometryFallback &&
    prefetchOpts.prefetchedGeometryJson != null &&
    geometryJsonItemRenderable({
      type: 'geometry_json',
      code: prefetchOpts.prefetchedGeometryJson,
    })
  ) {
    return true;
  }
  const pv = data.visualizations;
  if (Array.isArray(pv) && pv.length > 0) return true;
  return false;
}

/**
 * strict filter 全滅時，仍嘗試渲染常見物理／Plotly／SVG 形（略過 Zod 過嚴；plotly_chart 仍須通過 plotlyDataLooksRenderable，避免 data:[] 僅顯示標題）。
 */
function lenientFallbackVizItems(raw: unknown[] | undefined | null): VisualizationItem[] {
  if (!Array.isArray(raw)) return [];
  const out: VisualizationItem[] = [];
  for (const it of raw) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) continue;
    const o = it as Record<string, unknown>;
    const t = o.type;
    if (t === 'plotly_chart') {
      // #region agent log
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4e4e43' },
        body: JSON.stringify({
          sessionId: '4e4e43',
          hypothesisId: 'H1',
          location: 'VisualizationRenderer.tsx:lenientFallbackVizItems',
          message: 'plotly_chart lenient candidate',
          data: {
            looksRenderable: plotlyDataLooksRenderable(o.data),
            dataIsArray: Array.isArray(o.data),
            dataLen: Array.isArray(o.data) ? o.data.length : null,
            dataTypeOf: typeof o.data,
            dataKeys:
              o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)
                ? Object.keys(o.data as object).slice(0, 8)
                : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!plotlyDataLooksRenderable(o.data)) continue;
      out.push(unwrapPlotlyChartVisualizationItem(it) as VisualizationItem);
      continue;
    }
    if (typeof t === 'string' && PLOTLY_TRACE_TYPES.has(t) && (o.x != null || o.y != null || o.z != null)) {
      out.push({
        type: 'plotly_chart',
        data: [o],
        layout: o.layout,
        title: (typeof o.title === 'string' && o.title.trim()) || (typeof o.name === 'string' && o.name.trim()) || 'Chart',
        caption: typeof o.caption === 'string' ? o.caption : undefined,
      } as VisualizationItem);
      continue;
    }
    if (t === 'svg_diagram') {
      const s =
        (typeof o.svgCode === 'string' && o.svgCode.trim()) ||
        (typeof o.code === 'string' && o.code.trim());
      if (s) out.push(it as VisualizationItem);
    }
  }
  return out;
}

// -------------------------------------------------------------------
// 繪圖引擎：注入 GeoGebra 風格
// -------------------------------------------------------------------
const normalizePlotlyData = (rawIn: any): any[] | null => {
  const raw: any = coercePlotlyDataJsonIfString(rawIn);
  if (raw == null) return null;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (typeof raw === 'object' && Array.isArray(raw.data) && raw.data.length > 0) return raw.data;
  // 模型常把 traces 放在 data: { data: [...], layout } 雙層物件裡
  if (
    typeof raw === 'object' &&
    raw.data != null &&
    typeof raw.data === 'object' &&
    !Array.isArray(raw.data) &&
    Array.isArray((raw.data as any).data) &&
    (raw.data as any).data.length > 0
  ) {
    return (raw.data as any).data;
  }
  if (typeof raw === 'object' && Array.isArray(raw.traces) && raw.traces.length > 0) return raw.traces;
  if (typeof raw === 'object' && raw.x != null && raw.y != null) return [raw];
  // 單一 trace：surface 可僅有 z；mesh3d 可僅有頂點或 i,j,k
  if (
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    typeof raw.type === 'string' &&
    PLOTLY_TRACE_TYPES.has(raw.type)
  ) {
    if (raw.type === 'surface' && raw.z != null) return [raw];
    if (raw.type === 'mesh3d') {
      if (Array.isArray(raw.x) && raw.x.length > 0) return [raw];
      if (raw.i != null && raw.j != null && raw.k != null) return [raw];
    }
    if (
      raw.type === 'scatter3d' &&
      (raw.x != null || raw.y != null || raw.z != null)
    ) {
      return [raw];
    }
    if (
      (raw.type === 'scatter' ||
        raw.type === 'scattergl' ||
        raw.type === 'bar' ||
        raw.type === 'line' ||
        raw.type === 'pie') &&
      ((Array.isArray(raw.y) && raw.y.length > 0) || (Array.isArray(raw.x) && raw.x.length > 0))
    ) {
      return [raw];
    }
    if (raw.type === 'histogram' && Array.isArray(raw.x) && raw.x.length > 0) return [raw];
  }
  return null;
};

/** 解開 visualizations[] 內 plotly_chart.data 的雙層包裝或單一 trace 誤放在 data */
function unwrapPlotlyChartVisualizationItem(viz: any): any {
  if (!viz || viz.type !== 'plotly_chart') return viz;
  const raw = coercePlotlyDataJsonIfString(viz.data);
  if (raw !== viz.data) {
    viz = { ...viz, data: raw };
  }
  if (raw == null) return viz;
  if (Array.isArray(raw) && raw.length > 0) return viz;
  if (typeof raw !== 'object' || Array.isArray(raw)) return viz;
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.data) && o.data.length > 0) {
    return { ...viz, data: o.data, layout: viz.layout ?? o.layout };
  }
  if (Array.isArray(o.traces) && o.traces.length > 0) {
    return { ...viz, data: o.traces, layout: viz.layout ?? o.layout };
  }
  const inner = o.data;
  if (
    inner != null &&
    typeof inner === 'object' &&
    !Array.isArray(inner) &&
    Array.isArray((inner as Record<string, unknown>).data) &&
    (inner as { data: unknown[] }).data.length > 0
  ) {
    return {
      ...viz,
      data: (inner as { data: unknown[] }).data,
      layout: viz.layout ?? o.layout ?? (inner as { layout?: unknown }).layout,
    };
  }
  const t = o.type;
  if (typeof t === 'string' && PLOTLY_TRACE_TYPES.has(t)) {
    const singleOk =
      (t === 'surface' && o.z != null) ||
      (t === 'mesh3d' &&
        ((Array.isArray(o.x) && (o.x as unknown[]).length > 0) ||
          (o.i != null && o.j != null && o.k != null))) ||
      (t === 'scatter3d' && (o.x != null || o.y != null || o.z != null)) ||
      (o.x != null && o.y != null) ||
      (t === 'histogram' && Array.isArray(o.x) && o.x.length > 0) ||
      ((t === 'scatter' ||
        t === 'scattergl' ||
        t === 'bar' ||
        t === 'line' ||
        t === 'pie') &&
        ((Array.isArray(o.y) && o.y.length > 0) || (Array.isArray(o.x) && o.x.length > 0)));
    if (singleOk) {
      return { ...viz, data: [raw], layout: viz.layout ?? (raw as { layout?: unknown }).layout };
    }
  }
  return viz;
}

function traceIsPlotly3D(t: any): boolean {
  const ty = String(t?.type || '');
  return (
    ty === 'mesh3d' ||
    ty === 'scatter3d' ||
    ty === 'surface' ||
    ty === 'volume' ||
    ty === 'cone' ||
    ty === 'isosurface'
  );
}

/** scatter3d 缺 z／長度不符／無任何有限點時 Plotly WebGL 易失敗，繪製前剔除 */
function filterBrokenScatter3dTraces(traces: any[]): { traces: any[]; droppedBadScatter3d: boolean } {
  let droppedBadScatter3d = false;
  const out = traces.filter((t) => {
    if (t?.type !== 'scatter3d') return true;
    const { x, y, z } = t;
    if (!Array.isArray(x) || !Array.isArray(y) || !Array.isArray(z)) {
      droppedBadScatter3d = true;
      return false;
    }
    const n = Math.min(x.length, y.length, z.length);
    if (n < 1) {
      droppedBadScatter3d = true;
      return false;
    }
    let finite = 0;
    for (let i = 0; i < n; i++) {
      const a = Number(x[i]);
      const b = Number(y[i]);
      const c = Number(z[i]);
      if (!Number.isNaN(a) && !Number.isNaN(b) && !Number.isNaN(c)) finite++;
    }
    if (finite < 1) {
      droppedBadScatter3d = true;
      return false;
    }
    return true;
  });
  return { traces: out, droppedBadScatter3d };
}

const PlotlyChart: React.FC<{ data: any; layout?: any; title?: string; caption?: string; explanation?: string }> = ({
  data,
  layout,
  title,
  caption,
  explanation,
}) => {
  const chartId = useRef(`plotly-${Math.random().toString(36).substr(2, 9)}`);
  const [plotlyWebGlNote, setPlotlyWebGlNote] = useState<string | null>(null);
  const [plotlyFailed, setPlotlyFailed] = useState(false);

  const isDarkClass = useSyncExternalStore(
    subscribeHtmlDarkClass,
    getHtmlDarkClassSnapshot,
    getHtmlDarkClassServerSnapshot,
  );

  const plotInputsSig = useMemo(() => {
    try {
      return JSON.stringify({
        data,
        layout: layout ?? null,
        title: title ?? null,
        caption: caption ?? null,
        explanation: explanation ?? null,
        isDarkClass,
      });
    } catch {
      return `${String(data)}|${String(layout)}|${title}|${caption}|${explanation}|${isDarkClass}`;
    }
  }, [data, layout, title, caption, explanation, isDarkClass]);

  const hasPlotlyTraces = useMemo(() => {
    const t = normalizePlotlyData(data);
    return Array.isArray(t) && t.length > 0;
  }, [plotInputsSig, data]);

  useEffect(() => {
    setPlotlyWebGlNote(null);
    setPlotlyFailed(false);
    const rawTraces = normalizePlotlyData(data);
    if (!rawTraces || rawTraces.length === 0) return;

    const vizOpts = { title, caption, explanation };
    const coercePlotlyNum = (v: any) => {
      if (v === null || v === undefined) return v;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
      return v;
    };
    const traces = patchPhysics3dTraces(patchStem3dPlotlyTraces(rawTraces, vizOpts), vizOpts);
    const coerceNumArr = (a: any): any =>
      Array.isArray(a) ? a.map((v: any) => coercePlotlyNum(v)) : a;

    const tracesCoerced = traces.map((t: any) => {
      if (t?.type === 'scatter' && Array.isArray(t.x) && Array.isArray(t.y)) {
        return { ...t, x: t.x.map(coercePlotlyNum), y: t.y.map(coercePlotlyNum) };
      }
      if (t?.type === 'scatter3d' && Array.isArray(t.x) && Array.isArray(t.y) && Array.isArray(t.z)) {
        return {
          ...t,
          x: t.x.map(coercePlotlyNum),
          y: t.y.map(coercePlotlyNum),
          z: t.z.map(coercePlotlyNum),
        };
      }
      if (t?.type === 'mesh3d') {
        const ijkm = (a: any) =>
          Array.isArray(a) ? a.map((v: any) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v)) : a;
        return {
          ...t,
          x: coerceNumArr(t.x),
          y: coerceNumArr(t.y),
          z: coerceNumArr(t.z),
          ...(Array.isArray(t.i) ? { i: ijkm(t.i) } : {}),
          ...(Array.isArray(t.j) ? { j: ijkm(t.j) } : {}),
          ...(Array.isArray(t.k) ? { k: ijkm(t.k) } : {}),
        };
      }
      if (t?.type === 'surface') {
        const z = t.z;
        let zCoerced = z;
        if (Array.isArray(z) && z.length > 0 && Array.isArray(z[0])) {
          zCoerced = z.map((row: any) => (Array.isArray(row) ? row.map(coercePlotlyNum) : coercePlotlyNum(row)));
        } else if (Array.isArray(z)) {
          zCoerced = z.map(coercePlotlyNum);
        }
        return {
          ...t,
          x: Array.isArray(t.x) ? coerceNumArr(t.x) : t.x,
          y: Array.isArray(t.y) ? coerceNumArr(t.y) : t.y,
          z: zCoerced,
        };
      }
      return t;
    });

    const { traces: tracesForPlot, droppedBadScatter3d } = filterBrokenScatter3dTraces(tracesCoerced);
    /** 2D 滴定／函數圖用 scattergl 易與 3Dmol 等 WebGL 上下文衝突，且在容器 0×0 首幀會刷 GL_INVALID_FRAMEBUFFER_OPERATION */
    const tracesForPlot2d = tracesForPlot.map((t: any) =>
      t?.type === 'scattergl' ? { ...t, type: 'scatter' } : t,
    );
    if (droppedBadScatter3d) {
      setPlotlyWebGlNote(
        '3D 座標資料不完整（例如缺少 z 或 x/y/z 長度不符），已略過無效的 scatter3d。若批改曾改以 Flash 模型，視覺化可能較不完整，可再試一次批改。',
      );
    }
    if (!tracesForPlot2d || tracesForPlot2d.length === 0) return;

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

    /** 端點附近線段斜率過陡（如圓弧 y=k−√(r²−x²) 近邊界）時，Catmull-Rom／spline 易外插成鉤狀，應改線性連線 */
    const endpointsHaveSteepSlope = (xArr: any[], yArr: any[], threshold = 4): boolean => {
      if (!Array.isArray(xArr) || !Array.isArray(yArr) || xArr.length < 4) return false;
      const absSlopeAt = (i: number): number | null => {
        const x0 = Number(xArr[i]),
          y0 = Number(yArr[i]);
        const x1 = Number(xArr[i + 1]),
          y1 = Number(yArr[i + 1]);
        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return null;
        const dx = x1 - x0;
        if (Math.abs(dx) < 1e-12) return Infinity;
        return Math.abs((y1 - y0) / dx);
      };
      const steep = (i: number) => {
        const s = absSlopeAt(i);
        return s != null && s > threshold;
      };
      const n = xArr.length;
      return steep(0) || steep(1) || steep(n - 3) || steep(n - 2);
    };

    /**
     * Smart Spline Heuristic：
     * - 閉合 + 點數少(< 10) + 有銳角 → 幾何多邊形 → 保持線性
     * - 其餘 → 函數曲線 → 套用平滑
     */
    const traceNameSuggestsCircleArc = (trace: { name?: string } | undefined): boolean => {
      const nm = String(trace?.name ?? '');
      return /圓弧|圆弧|下半圓|上半圓|circular\s*arc|circle\s*\(/i.test(nm);
    };

    const shouldSmoothTrace = (xArr: any[], yArr: any[], trace?: { name?: string }): boolean => {
      if (!Array.isArray(xArr) || !Array.isArray(yArr)) return false;
      const len = xArr.length;
      if (len < 3) return false;
      // 含有字串型 x（類別軸）→ 不平滑
      if (xArr.some((v: any) => typeof v === 'string') || yArr.some((v: any) => typeof v === 'string')) return false;
      if (traceNameSuggestsCircleArc(trace)) return false;
      if (endpointsHaveSteepSlope(xArr, yArr)) return false;
      // 資料點很多 → 幾乎一定是函數曲線
      if (len > 10) return true;
      // 少量點：若首尾閉合且有銳角 → 幾何多邊形
      if (isClosedShape(xArr, yArr) && hasSharpAngles(xArr, yArr)) return false;
      // 少量點但非閉合或無銳角 → 仍嘗試平滑
      return true;
    };

    const enhancedData = tracesForPlot2d.map((trace: any, index: number) => {
        const newTrace = { ...trace };
        const defaultColor = geoGebraColors[index % geoGebraColors.length];

        // 若為散佈圖或折線圖
        if (newTrace.type === 'scatter') {
            // 線條渲染邏輯
            if (!newTrace.mode || newTrace.mode.includes('lines')) {
                const xLength = Array.isArray(newTrace.x) ? newTrace.x.length : 0;
                const yLength = Array.isArray(newTrace.y) ? newTrace.y.length : 0;
                if (xLength > 2 && yLength > 2) {
                    const lineBase =
                        newTrace.line != null && typeof newTrace.line === 'object' ? newTrace.line : {};
                    if (shouldSmoothTrace(newTrace.x, newTrace.y, newTrace)) {
                        // ✅ 函數曲線：自適應細分 + Plotly spline
                        const smoothed = adaptiveSmoothTrace(newTrace.x, newTrace.y);
                        newTrace.x = smoothed.x;
                        newTrace.y = smoothed.y;
                        newTrace.line = { ...lineBase, shape: 'spline', smoothing: 1 };
                    } else {
                        // ✅ 幾何多邊形：保持銳利直線
                        newTrace.line = { ...lineBase, shape: 'linear' };
                    }
                }

                // 線條加粗
                const lineMergeBase =
                    newTrace.line != null && typeof newTrace.line === 'object' ? newTrace.line : {};
                newTrace.line = {
                    width: 3, // GeoGebra 風格的粗實線
                    color: trace.line?.color || defaultColor,
                    ...trace.line,
                    ...lineMergeBase
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

    const allTraces3D =
      tracesForPlot2d.length > 0 && tracesForPlot2d.every((t: any) => traceIsPlotly3D(t));
    if (allTraces3D) {
      delete (mergedLayout as any).xaxis;
      delete (mergedLayout as any).yaxis;
      const existingScene =
        layout?.scene != null && typeof layout.scene === 'object' && !Array.isArray(layout.scene)
          ? layout.scene
          : {};
      const sceneBase = {
        xaxis: {
          title: 'x',
          showgrid: true,
          zerolinecolor: '#ef4444',
          gridcolor: gridColor,
          backgroundcolor: 'rgba(0,0,0,0)',
        },
        yaxis: {
          title: 'y',
          showgrid: true,
          zerolinecolor: '#22c55e',
          gridcolor: gridColor,
          backgroundcolor: 'rgba(0,0,0,0)',
        },
        zaxis: {
          title: 'z',
          showgrid: true,
          zerolinecolor: '#3b82f6',
          gridcolor: gridColor,
          backgroundcolor: 'rgba(0,0,0,0)',
        },
        aspectmode: 'cube',
        camera: { projection: { type: 'orthographic' }, eye: { x: 1.45, y: 1.45, z: 1.25 } },
        bgcolor: 'rgba(0,0,0,0)',
      };
      (mergedLayout as any).scene = { ...sceneBase, ...existingScene };
    }

    // 保留 AI 若有設定特定的 Scale Anchor (例如 1:1 幾何比例)
    if (!allTraces3D && layout?.xaxis?.scaleanchor) {
        mergedLayout.xaxis = { ...mergedLayout.xaxis, ...layout.xaxis };
    }

    const ctxStr = [title, caption, explanation].filter(Boolean).join(' ');
    const titrationPhChart =
      /滴定|titration/i.test(ctxStr) &&
      (/p\s*h|酸鹼|磷酸|氫氧化|當量|equivalence|緩衝|buffer/i.test(ctxStr) ||
        /naoh|h\s*3\s*p\s*o\s*4|h3po4/i.test(ctxStr.replace(/\s/g, '')));
    if (titrationPhChart && !mergedLayout.scene) {
      mergedLayout.yaxis = {
        ...(mergedLayout.yaxis || {}),
        range: [0, 14],
        autorange: false,
      };
    }

    const config = { 
        responsive: true, 
        displayModeBar: true, // 允許使用者縮放平移
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    const el = document.getElementById(chartId.current);
    let cancelled = false;
    let resizeRo: ResizeObserver | null = null;

    const relayout = () => {
      try {
        if (!cancelled && el) Plotly.Plots.resize(el);
      } catch {
        /* ignore */
      }
    };

    const runNewPlot = () => {
      if (cancelled || !el) return;
      if (el.clientWidth < 2 || el.clientHeight < 2) return;
      try {
        Plotly.newPlot(el, enhancedData, mergedLayout, config);
        setPlotlyFailed(false);
        requestAnimationFrame(() => {
          if (!cancelled && el) {
            try {
              Plotly.Plots.resize(el);
            } catch {
              /* ignore */
            }
          }
        });
      } catch (e) {
        console.error("Plotly Render Error:", e);
        setPlotlyFailed(true);
      }
    };

    /** 雙 rAF：等 flex/摺疊版面把 min-height 算進佈局後再畫，避免 WebGL 0×0 framebuffer */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        runNewPlot();
      });
    });

    if (el) {
      resizeRo = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (cancelled || !el) return;
          if (el.clientWidth < 2 || el.clientHeight < 2) return;
          const gd = el as unknown as { data?: unknown };
          const hasPlot = gd.data != null && Array.isArray(gd.data);
          if (hasPlot) {
            relayout();
          } else {
            runNewPlot();
          }
        });
      });
      resizeRo.observe(el);
    }
    window.addEventListener('resize', relayout);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', relayout);
      resizeRo?.disconnect();
      try {
        const purgeEl = el ?? document.getElementById(chartId.current);
        if (purgeEl) Plotly.purge(purgeEl);
      } catch {
        /* ignore */
      }
    };
  }, [plotInputsSig]);

  if (!hasPlotlyTraces) {
    // #region agent log
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '09f966' },
      body: JSON.stringify({
        sessionId: '09f966',
        hypothesisId: 'H2',
        location: 'VisualizationRenderer.tsx:PlotlyChart',
        message: 'no plotly traces after normalize',
        data: {
          hasTitle: !!(typeof title === 'string' && title.trim()),
          normalizedNull: normalizePlotlyData(data) == null,
          rawDataType: data == null ? 'null' : Array.isArray(data) ? 'array' : typeof data,
          rawArrayLen: Array.isArray(data) ? data.length : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const hint =
      explanation?.trim() || caption?.trim() || (typeof title === 'string' && title.trim());
    return (
      <div className="w-full max-w-full max-h-[min(72vh,560px)] overflow-auto space-y-2">
        {hint ? (
          <div className="min-h-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 shadow-inner">
            {title ? (
              <div className="mb-2 text-sm font-bold text-[var(--text-primary)]">
                <LatexRenderer content={String(title)} isInline />
              </div>
            ) : null}
            {explanation?.trim() ? <LatexRenderer content={explanation} /> : null}
            {caption?.trim() ? (
              <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">{caption}</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200/90">
            此圖表缺少可繪製的 Plotly 資料（trace 為空或格式無法辨識）。請重試批改，或改以題目圖／SVG 示意呈現。
          </div>
        )}
      </div>
    );
  }

  if (plotlyFailed) {
    const hint =
      explanation?.trim() || caption?.trim() || (typeof title === 'string' && title.trim());
    return (
      <div className="w-full max-w-full max-h-[min(72vh,560px)] overflow-auto space-y-2">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200/90 shadow-inner">
          此圖表繪製時發生錯誤（可能為資料格式或瀏覽器 WebGL）。可重試批改、重新整理頁面，或改以題目圖／SVG 示意。
        </div>
        {hint ? (
          <div className="min-h-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 shadow-inner">
            {title ? (
              <div className="mb-2 text-sm font-bold text-[var(--text-primary)]">
                <LatexRenderer content={String(title)} isInline />
              </div>
            ) : null}
            {explanation?.trim() ? <LatexRenderer content={explanation} /> : null}
            {caption?.trim() ? (
              <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">{caption}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full max-h-[min(72vh,560px)] overflow-auto space-y-1">
      <div
        id={chartId.current}
        data-asea-will-read-frequently
        className="w-full h-full min-h-[360px] rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-main)] shadow-inner"
        style={{ minHeight: 360 }}
      />
      {plotlyWebGlNote ? (
        <p className="text-xs text-amber-700 dark:text-amber-300 px-1">{plotlyWebGlNote}</p>
      ) : null}
    </div>
  );
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

function parseGeometryJsonFromViz(
  code: unknown,
  prefetched: GeometryJSON | null | undefined
): GeometryJSON | null {
  try {
    if (code && typeof code === 'object' && !Array.isArray(code)) {
      const o = code as Record<string, unknown>;
      if (isRegularPolygonSolverPayload(o)) {
        return solverModePayloadToGeometryJSON(o);
      }
      if (typeof (code as GeometryJSON).shape_type === 'string') {
        return code as GeometryJSON;
      }
    }
    if (typeof code === 'string' && code.trim()) {
      const cleaned = code
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      let parsed = JSON.parse(cleaned) as unknown;
      if (typeof parsed === 'string') {
        const inner = parsed.trim();
        if (inner.startsWith('{')) {
          try {
            parsed = JSON.parse(inner) as unknown;
          } catch {
            /* keep outer string */
          }
        }
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const o = parsed as Record<string, unknown>;
        if (isRegularPolygonSolverPayload(o)) {
          return solverModePayloadToGeometryJSON(o);
        }
      }
      return parsed as GeometryJSON;
    }
  } catch {
    /* fall through */
  }
  return prefetched ?? null;
}

/** ReactMarkdown 會吃掉單一 \\n；轉成 Markdown 硬換行以保留圖示說明多行排版 */
function vizExplanationMarkdownHardBreaks(text: string): string {
  if (typeof text !== 'string' || !text.includes('\n')) return text;
  return text.split('\n').join('  \n');
}

export const VisualizationRenderer: React.FC<{
  content: any;
  compounds?: Compound[];
  /** 題目圖預先萃取的幾何 JSON；模型 output 缺漏或解析失敗時作為後備 */
  prefetchedGeometryJson?: GeometryJSON | null;
  /** 與幾何預抓並用：嚴格模式下攔截 python_script 等並供使用者觸發重新萃取 */
  onRetryExtraction?: () => void;
  /**
   * 數學門專用：模型 visualizations 全數被過濾掉時，仍可用 prefetchedGeometryJson 畫題目圖。
   */
  allowPrefetchedGeometryFallback?: boolean;
  /** 題幹預抓後備圖在 UI 上的標題（例：綁定子題編號）；預設「題目圖形」 */
  prefetchedGeometryVizTitle?: string;
}> = ({
  content,
  compounds: compoundsProp,
  prefetchedGeometryJson,
  onRetryExtraction,
  allowPrefetchedGeometryFallback = false,
  prefetchedGeometryVizTitle,
}) => {
  const [parsedData, setParsedData] = useState<VisualizationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vizPayload = parsedData;

  const prefetchGateOpts = useMemo(
    () => ({
      allowPrefetchedGeometryFallback: !!allowPrefetchedGeometryFallback,
      prefetchedGeometryJson,
    }),
    [allowPrefetchedGeometryFallback, prefetchedGeometryJson],
  );

  const vizParseInputSig = useMemo(() => {
    const partGeo =
      prefetchedGeometryJson == null ? '' : stableStringifyForVizFingerprint(prefetchedGeometryJson);
    const partCompounds =
      compoundsProp == null ? '' : stableStringifyForVizFingerprint(compoundsProp);
    const partContent =
      content == null
        ? 'null'
        : typeof content === 'string'
          ? `str:${content}`
          : stableStringifyForVizFingerprint(content);
    return `${allowPrefetchedGeometryFallback ? '1' : '0'}|${partGeo}|${partCompounds}|${partContent}`;
  }, [content, compoundsProp, allowPrefetchedGeometryFallback, prefetchedGeometryJson]);

  const lastVizParseSigRef = useRef<string | null>(null);

  const prefetchedVizTitle = prefetchedGeometryVizTitle?.trim() || '題目圖形';

  const prefetchGeoSig = useMemo(
    () =>
      prefetchedGeometryJson == null ? '' : stableStringifyForVizFingerprint(prefetchedGeometryJson),
    [prefetchedGeometryJson],
  );

  const displayVisualizations = useMemo((): VisualizationItem[] => {
    const raw = vizPayload?.visualizations;
    const base = filterRenderableVisualizations(raw) as VisualizationItem[];
    // #region agent log
    if (Array.isArray(raw) && raw.length > 0) {
      const reasons: { type: string; reason?: string }[] = [];
      for (const it of raw) {
        if (!it || typeof it !== 'object' || Array.isArray(it)) continue;
        const vr = validateVisualizationItem(it);
        if (!vr.valid) {
          reasons.push({
            type: String((it as { type?: string }).type ?? '?'),
            reason: vr.reason,
          });
        }
        if (reasons.length >= 5) break;
      }
      fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4e4e43' },
        body: JSON.stringify({
          sessionId: '4e4e43',
          hypothesisId: 'H2',
          location: 'VisualizationRenderer.tsx:displayVisualizations',
          message: 'viz filter vs raw',
          data: {
            rawLen: raw.length,
            strictPass: base.length,
            sampleRejected: reasons,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    if (base.length > 0) return base;
    const lenient = lenientFallbackVizItems(raw as unknown[] | undefined);
    if (lenient.length > 0) return lenient;
    if (
      allowPrefetchedGeometryFallback &&
      prefetchedGeometryJson != null &&
      geometryJsonItemRenderable({ type: 'geometry_json', code: prefetchedGeometryJson })
    ) {
      return [
        {
          type: 'geometry_json',
          title: prefetchedVizTitle,
          code: prefetchedGeometryJson as unknown as string,
        } as VisualizationItem,
      ];
    }
    const ex = typeof vizPayload?.explanation === 'string' ? vizPayload.explanation.trim() : '';
    const fbdFallback = buildFbdFallbackFromExplanation(ex, raw as unknown[] | undefined);
    if (fbdFallback) return [fbdFallback];
    return base;
  }, [
    vizPayload?.visualizations,
    vizPayload?.explanation,
    allowPrefetchedGeometryFallback,
    prefetchGeoSig,
    prefetchedGeometryJson,
    prefetchedVizTitle,
  ]);

  useEffect(() => {
    if (!isVizRendererContentRenderable(content, compoundsProp, prefetchGateOpts)) {
      lastVizParseSigRef.current = null;
      setParsedData(null);
      setError(null);
      return;
    }
    if (!content) return;

    if (lastVizParseSigRef.current === vizParseInputSig) {
      return;
    }
    lastVizParseSigRef.current = vizParseInputSig;

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
       // 生理機制：根層 JSON（category + layers）→ 單一 physiology_mechanism 視覺化
       if (
         parsed.category === 'Physiology' &&
         Array.isArray(parsed.layers) &&
         parsed.layers.length > 0 &&
         (!parsed.visualizations || parsed.visualizations.length === 0)
       ) {
         setParsedData({
           explanation: parsed.explanation,
           visualizations: [
             {
               type: 'physiology_mechanism',
               category: parsed.category,
               topic: parsed.topic || parsed.title || 'Physiology',
               layers: parsed.layers,
               visual_style: parsed.visual_style,
               interaction_enabled: parsed.interaction_enabled,
               title: parsed.title,
               caption: parsed.caption,
             },
           ],
           compounds: parsed.compounds,
         });
         return;
       }

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
         parsed.visualizations = parsed.visualizations.map((vizIn: any) => {
           const viz = unwrapPlotlyChartVisualizationItem(vizIn);
           if (
             viz.type === 'chem_aromatic_ring' ||
             viz.type === 'physics_wave_interference' ||
             viz.type === 'physics_snell_diagram' ||
             viz.type === 'stem_xy_chart' ||
             viz.type === 'titration_curve' ||
             viz.type === 'circuit_schematic' ||
             viz.type === 'chem_smiles_2d_lone_pairs' ||
             viz.type === 'biology_punnett_square' ||
             viz.type === 'biology_pedigree' ||
             viz.type === 'mermaid_flowchart' ||
             viz.type === 'earth_celestial_geometry' ||
             viz.type === 'earth_contour_map' ||
             viz.type === 'energy_level_diagram' ||
             viz.type === 'periodic_table_highlight'
           ) {
             return viz;
           }
           // 先辨識 Plotly trace：模型常在同一物件上誤帶 schema 的 cid，物理 3D 圖會因此被當成 mol3d 而無法繪製
           if (viz.type === 'mol3d') {
             return viz;
           }
           if (viz.type === 'geometry_json') {
             return viz;
           }
           const hasPlotlyTraceShape =
             viz.type &&
             PLOTLY_TRACE_TYPES.has(viz.type) &&
             (viz.x != null || viz.y != null || viz.z != null);
           if (hasPlotlyTraceShape) {
             return {
               type: 'plotly_chart',
               title: viz.title || viz.name || 'Chart',
               caption: viz.caption,
               data: [viz],
               layout: viz.layout,
             };
           }
           const looksMol3d =
             (viz.cid != null && String(viz.cid).trim() !== '') ||
             (typeof viz.smiles === 'string' && viz.smiles.trim().length > 0) ||
             (typeof viz.pdb === 'string' && viz.pdb.trim().length > 0) ||
             (typeof viz.mol === 'string' && viz.mol.trim().length > 0);
           if (looksMol3d) {
             return viz;
           }
           if (
             viz.type === 'svg_diagram' &&
             !(typeof viz.svgCode === 'string' && viz.svgCode.trim()) &&
             typeof viz.code === 'string' &&
             viz.code.trim()
           ) {
             return { ...viz, svgCode: viz.code };
           }
           return viz;
         });
       }

       // Normalize single visualization items to array format
       if (parsed.type === 'visualization' || parsed.chartType || parsed.type === 'plotly_chart' || parsed.type === 'recharts_plot' || parsed.type === 'nanobanan_image' || parsed.type === 'mol3d' || parsed.type === 'geometry_json' || parsed.type === 'free_body_diagram' || parsed.type === 'python_plot' || parsed.type === 'python_script' || parsed.type === 'physics_collision' || parsed.type === 'physiology_mechanism' || parsed.type === 'asea_render' || parsed.type === 'chemistry_2d' || parsed.type === 'chem_aromatic_ring' || parsed.type === 'physics_wave_interference' || parsed.type === 'physics_snell_diagram' || parsed.type === 'stem_xy_chart' || parsed.type === 'titration_curve' || parsed.type === 'circuit_schematic' || parsed.type === 'chem_smiles_2d_lone_pairs' || parsed.type === 'biology_punnett_square' || parsed.type === 'biology_pedigree' || parsed.type === 'mermaid_flowchart' || parsed.type === 'earth_celestial_geometry' || parsed.type === 'earth_contour_map' || parsed.type === 'energy_level_diagram' || parsed.type === 'periodic_table_highlight' || parsed.cid || parsed.smiles) {
           // Direct visualization object detected
           const type = parsed.type === 'plotly_chart' ? 'plotly_chart' : 
                        parsed.type === 'svg_diagram' ? 'svg_diagram' : 
                        parsed.type === 'geometry_json' ? 'geometry_json' :
                        parsed.type === 'nanobanan_image' ? 'nanobanan_image' : 
                        parsed.type === 'free_body_diagram' ? 'free_body_diagram' :
                        parsed.type === 'python_plot' ? 'python_plot' :
                        parsed.type === 'python_script' ? 'python_script' :
                        parsed.type === 'physics_collision' ? 'physics_collision' :
                        parsed.type === 'physiology_mechanism' ? 'physiology_mechanism' :
                        parsed.type === 'asea_render' ? 'asea_render' :
                        parsed.type === 'chemistry_2d' ? 'chemistry_2d' :
                        parsed.type === 'chem_aromatic_ring' ? 'chem_aromatic_ring' :
                        parsed.type === 'physics_wave_interference' ? 'physics_wave_interference' :
                        parsed.type === 'physics_snell_diagram' ? 'physics_snell_diagram' :
                        parsed.type === 'stem_xy_chart' ? 'stem_xy_chart' :
                        parsed.type === 'titration_curve' ? 'titration_curve' :
                        parsed.type === 'circuit_schematic' ? 'circuit_schematic' :
                        parsed.type === 'chem_smiles_2d_lone_pairs' ? 'chem_smiles_2d_lone_pairs' :
                        parsed.type === 'biology_punnett_square' ? 'biology_punnett_square' :
                        parsed.type === 'biology_pedigree' ? 'biology_pedigree' :
                        parsed.type === 'mermaid_flowchart' ? 'mermaid_flowchart' :
                        parsed.type === 'earth_celestial_geometry' ? 'earth_celestial_geometry' :
                        parsed.type === 'earth_contour_map' ? 'earth_contour_map' :
                        parsed.type === 'energy_level_diagram' ? 'energy_level_diagram' :
                        parsed.type === 'periodic_table_highlight' ? 'periodic_table_highlight' :
                        (parsed.type === 'mol3d' || parsed.cid || parsed.smiles) ? 'mol3d' : 'recharts_plot';
           
           let vizItem: any = { ...parsed, type };
           if (
             type === 'svg_diagram' &&
             !(typeof vizItem.svgCode === 'string' && vizItem.svgCode.trim()) &&
             typeof vizItem.code === 'string' &&
             vizItem.code.trim()
           ) {
             vizItem = { ...vizItem, svgCode: vizItem.code };
           }
           // plotly_chart: 字串 JSON、巢狀 { data: [...] }、雙層 data.data（與 unwrapPlotlyChartVisualizationItem 對齊）
           if (type === 'plotly_chart') {
             let vd: unknown = coercePlotlyDataJsonIfString(vizItem.data ?? parsed.data);
             if (Array.isArray(vd) && vd.length > 0) {
               vizItem = { ...vizItem, data: vd };
             } else if (vd && typeof vd === 'object' && !Array.isArray(vd)) {
               const r = vd as Record<string, unknown>;
               if (Array.isArray(r.data) && r.data.length > 0) {
                 vizItem = { ...vizItem, data: r.data, layout: vizItem.layout ?? r.layout };
               } else if (
                 r.data != null &&
                 typeof r.data === 'object' &&
                 !Array.isArray(r.data) &&
                 Array.isArray((r.data as { data?: unknown[] }).data) &&
                 (r.data as { data: unknown[] }).data.length > 0
               ) {
                 vizItem = {
                   ...vizItem,
                   data: (r.data as { data: unknown[] }).data,
                   layout: vizItem.layout ?? r.layout,
                 };
               } else if (r.x != null && r.y != null) {
                 vizItem = { ...vizItem, data: [vd] };
               }
             }
             if (!vizItem.layout && parsed.layout) vizItem.layout = parsed.layout;
             vizItem = unwrapPlotlyChartVisualizationItem(vizItem);
           }
           
           setParsedData({ 
               explanation: parsed.explanation, 
               visualizations: [vizItem],
               compounds: parsed.compounds
           });
       } else if (
           parsed.type !== 'geometry_json' &&
           (
             (typeof parsed.svgCode === 'string' && parsed.svgCode.trim()) ||
             (typeof parsed.code === 'string' &&
               parsed.code.trim() &&
               (parsed.type === 'svg_diagram' ||
                 (parsed.code.includes('<svg') && !parsed.code.trim().startsWith('{'))))
           )
         ) {
           // Fallback if AI forgets the 'visualizations' array but provides svgCode (or code as SVG markup)
           const svgRaw =
             (typeof parsed.svgCode === 'string' && parsed.svgCode.trim()) ||
             (typeof parsed.code === 'string' ? parsed.code.trim() : '');
           setParsedData({
               explanation: parsed.explanation,
               visualizations: [{ type: 'svg_diagram', svgCode: svgRaw, title: parsed.title || 'Diagram' }],
               compounds: parsed.compounds
           });
       } else if (parsed.type === 'python_script' && typeof parsed.code === 'string' && parsed.code.trim()) {
           setParsedData({
             explanation: parsed.explanation,
             visualizations: [
               { type: 'python_script', code: parsed.code.trim(), title: parsed.title || 'Python script' },
             ],
             compounds: parsed.compounds,
           });
       } else {
           setParsedData(parsed);
       }
    }
    // vizParseInputSig 已涵蓋 content／compounds／prefetch 幾何與開關
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vizParseInputSig]);

  if (!isVizRendererContentRenderable(content, compoundsProp, prefetchGateOpts)) {
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
  
  if (!parsedData || !vizPayload) return null;

  if (!isParsedPayloadDisplayable(vizPayload, compoundsProp, prefetchGateOpts)) {
    return null;
  }

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {vizPayload.explanation && (
        <div className="rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 pl-4 pr-3 py-3">
           <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Visual Reasoning</h5>
           <div className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap font-medium">
             <SmartChart
               data={{
                 type: 'text_only',
                 chartType: 'line',
                 title: '',
                 data: [],
                 explanation: vizExplanationMarkdownHardBreaks(vizPayload.explanation),
               }}
               renderExplanationOnly={true}
             />
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {displayVisualizations.map((viz, idx) => {
          if (!viz) return null;
          try {
            const vk = stemVizItemReactKey(
              typeof viz.type === 'string' ? viz.type : 'viz',
              idx,
              viz,
            );
            if (viz.type === 'plotly_chart') {
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                    <div className="mb-3 flex justify-between items-center px-1">
                       <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>{viz.title || 'Mathematical Model'}</h5>
                    </div>
                    <PlotlyChart
                      data={viz.data}
                      layout={viz.layout}
                      title={viz.title}
                      caption={viz.caption}
                      explanation={vizPayload.explanation}
                    />
                    {viz.caption && (
                      <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                        <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                      </div>
                    )}
                </div>
              );
            }
            if (viz.type === 'recharts_plot') {
              return <SmartChart key={vk} data={{ 
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
            if (viz.type === 'chem_aromatic_ring') {
              const p = parsePhase3ChemAromatic(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {viz.title || '芳香環結構'}
                    </h5>
                  </div>
                  <div className="flex min-h-[200px] w-full items-center justify-center bg-[var(--bg-main)] rounded-xl overflow-x-auto max-w-full relative border border-[var(--border-color)]/60 p-4">
                    <ChemAromaticRingDiagram ring={p.ring} lone_pair_on_vertices={p.lone_pair_on_vertices} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'physics_wave_interference') {
              const p = parsePhase3WaveInterference(viz as unknown as Record<string, unknown>);
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {viz.title || '波動疊加'}
                    </h5>
                  </div>
                  <div className="flex min-h-[200px] w-full items-center justify-center bg-[var(--bg-main)] rounded-xl overflow-x-auto max-w-full relative border border-[var(--border-color)]/60 p-3">
                    <WaveInterferenceSvg
                      phaseOffsetRad={p.phase_offset_rad}
                      amplitude={p.amplitude}
                      label={p.label}
                    />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'physics_snell_diagram') {
              const p = parsePhase3Snell(viz as unknown as Record<string, unknown>);
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {viz.title || '折射／反射（斯涅爾）'}
                    </h5>
                  </div>
                  <div className="flex min-h-[200px] w-full items-center justify-center bg-[var(--bg-main)] rounded-xl overflow-x-auto max-w-full relative border border-[var(--border-color)]/60 p-2">
                    <SnellLawDiagram
                      n1={p.n1}
                      n2={p.n2}
                      incidentDeg={p.incident_deg}
                      refractedDeg={p.refracted_deg}
                    />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'stem_xy_chart') {
              const p = parsePhase3StemXY(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {viz.title || '資料圖表'}
                    </h5>
                  </div>
                  <StemXYChart
                    chartKind={p.chart_kind}
                    x={p.x}
                    y={p.y}
                    xAxisTitle={p.x_axis_title}
                    yAxisTitle={p.y_axis_title}
                    caption={viz.caption}
                  />
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'titration_curve') {
              const p = parseTitrationCurve(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      {viz.title || '滴定曲線'}
                    </h5>
                  </div>
                  <TitrationCurveChart
                    x={p.x}
                    y={p.y}
                    xAxisTitle={p.x_axis_title}
                    yAxisTitle={p.y_axis_title}
                    title={viz.title || '滴定曲線'}
                  />
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'circuit_schematic') {
              const p = parseCircuitSchematic(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {viz.title || '電路示意圖'}
                    </h5>
                  </div>
                  <div className="flex min-h-[120px] w-full items-center justify-center bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]/60 p-4">
                    <CircuitSchematicSvg payload={p} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'chem_smiles_2d_lone_pairs') {
              const p = parseChemSmiles2D(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      {viz.title || '2D 分子結構'}
                    </h5>
                  </div>
                  <div className="flex w-full flex-col items-center bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]/60 p-4">
                    <ChemSmiles2DWithLonePairs payload={p} caption={viz.caption} />
                  </div>
                </div>
              );
            }
            if (viz.type === 'biology_punnett_square') {
              const p = parsePunnettSquare(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                      {viz.title || '遺傳棋盤方格'}
                    </h5>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-main)] p-4">
                    <PunnettSquare payload={p} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'biology_pedigree') {
              const p = parsePedigree(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                      {viz.title || '譜系圖'}
                    </h5>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-main)] p-4">
                    <PedigreeChart payload={p} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'mermaid_flowchart') {
              const p = parseMermaidFlowchart(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                      {viz.title || '流程圖'}
                    </h5>
                  </div>
                  <MermaidFlowchart definition={p.definition} />
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'earth_celestial_geometry') {
              const p = parseEarthCelestial(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      {viz.title || '天體／月相示意'}
                    </h5>
                  </div>
                  <div className="flex justify-center rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-main)] p-4">
                    <CelestialGeometryDiagram payload={p} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'earth_contour_map') {
              const p = parseEarthContour(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      {viz.title || '等值線示意'}
                    </h5>
                  </div>
                  <div className="flex justify-center rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-main)] p-4">
                    <ContourMapSvg payload={p} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'energy_level_diagram') {
              const p = parseEnergyLevelDiagram(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      {viz.title || '能階示意圖'}
                    </h5>
                  </div>
                  <div className="flex justify-center rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-main)] p-4">
                    <EnergyLevelDiagram payload={p} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'periodic_table_highlight') {
              const p = parsePeriodicTableHighlight(viz as unknown as Record<string, unknown>);
              if (!p) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {viz.title || '週期表重點'}
                    </h5>
                  </div>
                  <div className="flex justify-center rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-main)] p-4">
                    <PeriodicTableHighlights payload={p} />
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'svg_diagram') {
              const svgMarkup = normalizeSvgDiagramMarkup(
                (typeof viz.svgCode === 'string' && viz.svgCode.trim()) ||
                  (typeof viz.code === 'string' && viz.code.trim()) ||
                  '',
              );
              if (!svgMarkup) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                       <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>{viz.title || 'Diagram'}</h5>
                  </div>
                  <div
                    className="flex min-h-[240px] max-h-[min(72vh,560px)] w-full h-auto flex-col items-center justify-center bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]/60 p-3 sm:p-4 overflow-auto max-w-full relative"
                  >
                    <SvgErrorBoundary fallbackLabel="題圖 SVG 無法顯示">
                      <SmartSvg svgCode={svgMarkup} className="svg-content w-full max-w-full min-h-[200px] max-h-full py-1 [&_svg]:max-h-[min(68vh,500px)] [&_svg]:max-w-full [&_svg]:h-auto" />
                    </SvgErrorBoundary>
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (
              shouldStrictInterceptGeometryViz(
                vizPayload,
                onRetryExtraction,
                allowPrefetchedGeometryFallback,
              ) &&
              isNonSvgGeometryVizType(viz.type)
            ) {
              console.warn(`[VisualizationRenderer] 攔截到非 SVG 幾何輸出: ${viz.type}`);
              return (
                <div
                  key={vk}
                  className={`text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded p-2 ${
                    typeof onRetryExtraction === 'function' ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (typeof onRetryExtraction === 'function') {
                      onRetryExtraction();
                    }
                  }}
                >
                  幾何圖形正在重新計算...（點擊重試）
                </div>
              );
            }
            if (viz.type === 'geometry_json') {
              let svgMarkup = '';
              try {
                const geoData = parseGeometryJsonFromViz(viz.code, prefetchedGeometryJson);
                if (geoData) {
                  if (!geoData.mid_level || !geoData.high_level) {
                    console.warn(
                      '[VisualizationRenderer] geometry_json 缺少三層特徵，使用 v2 降級路徑'
                    );
                  }
                  svgMarkup = geometryJsonToSvg(geoData);
                }
              } catch (e) {
                console.error('[VisualizationRenderer] geometry_json parse error:', e);
                if (prefetchedGeometryJson) {
                  try {
                    svgMarkup = geometryJsonToSvg(prefetchedGeometryJson);
                  } catch {
                    svgMarkup = '';
                  }
                }
              }
              if (!svgMarkup) return null;
              return (
                <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {viz.title || 'Diagram'}
                    </h5>
                  </div>
                  <div
                    className="flex min-h-[240px] max-h-[min(72vh,560px)] w-full h-auto flex-col items-center justify-center bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]/60 p-3 sm:p-4 overflow-auto max-w-full relative"
                  >
                    <SvgErrorBoundary fallbackLabel="題圖 SVG 無法顯示">
                      <SmartSvg svgCode={svgMarkup} className="svg-content w-full max-w-full min-h-[200px] max-h-full py-1 [&_svg]:max-h-[min(68vh,500px)] [&_svg]:max-w-full [&_svg]:h-auto" />
                    </SvgErrorBoundary>
                  </div>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                    </div>
                  )}
                </div>
              );
            }
            {
              const isPlotlyTraceType =
                typeof viz.type === 'string' && PLOTLY_TRACE_TYPES.has(viz.type);
              const showMol3d =
                !isPlotlyTraceType &&
                (viz.type === 'mol3d' || mol3dVizHasLoadableStructure(viz));
              if (showMol3d) {
                if (!mol3dVizHasLoadableStructure(viz)) {
                  return (
                    <div
                      key={vk}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200/90"
                    >
                      此題標示為 3D 分子模型，但回傳資料缺少 PubChem CID、SMILES、PDB 或 MOL，無法載入結構。若同欄另有曲線圖，請見下方圖表。
                    </div>
                  );
                }
                return (
                  <div key={vk} className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors">
                      <div className="mb-3 flex justify-between items-center px-1">
                         <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{viz.title || '3D Molecular Model'}</h5>
                      </div>
                      <div className="min-h-[280px] max-h-[min(72vh,560px)] max-w-full overflow-auto rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-main)]">
                        <Viewer3D
                          cid={viz.cid}
                          smiles={viz.smiles}
                          pdb={viz.pdb}
                          mol={viz.mol}
                          englishName={(viz as { english_name?: string }).english_name}
                        />
                      </div>
                      {viz.caption && (
                        <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                          <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{viz.caption}</p>
                        </div>
                      )}
                  </div>
                );
              }
            }
            if (viz.type === 'nanobanan_image' && viz.prompt) {
              return <InteractiveAnatomyViewer key={vk} vizData={viz} />;
            }
            if (viz.type === 'free_body_diagram' && isInclinedPlaneFbdViz(viz)) {
              return (
                <div
                  key={vk}
                  className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden"
                >
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {viz.title || '斜面受力分析（約束繪製）'}
                    </h5>
                  </div>
                  <InclinedPlaneFbd payload={parseInclinedPlanePayload(viz)} />
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">
                        {viz.caption}
                      </p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'free_body_diagram' && viz.forces) {
              const fbd = parseFreeBodyForces(viz as unknown as Record<string, unknown>);
              if (!fbd) return null;
              return (
                <FreeBodyVectorDiagram
                  key={vk}
                  vectors={fbd.forces}
                  objectShape={fbd.objectShape ?? viz.objectShape}
                />
              );
            }
            if (viz.type === 'asea_render' && isAseaRenderVizItem(viz)) {
              return (
                <AseaRenderBlock
                  key={vk}
                  engine={viz.engine}
                  topic={viz.topic}
                  data={viz.data as Record<string, unknown>}
                  styling={viz.styling}
                  apply_layout={viz.apply_layout}
                  title={viz.title}
                  caption={viz.caption}
                  svgCode={viz.svgCode}
                />
              );
            }
            if (viz.type === 'chemistry_2d' && viz.data && typeof viz.data === 'object' && !Array.isArray(viz.data)) {
              const molStr = (viz.data as Record<string, unknown>).molecule_string;
              if (typeof molStr !== 'string' || !molStr.trim()) {
                return null;
              }
              return (
                <AseaRenderBlock
                  key={vk}
                  engine="chemistry"
                  topic="molecular_structure"
                  data={viz.data as Record<string, unknown>}
                  styling={viz.styling}
                  apply_layout={viz.apply_layout}
                  title={viz.title || '2D 分子結構'}
                  caption={viz.caption}
                  svgCode={viz.svgCode}
                />
              );
            }
            if (viz.type === 'python_script' && typeof viz.code === 'string' && viz.code.trim()) {
              return (
                <div
                  key={vk}
                  className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden group transition-colors"
                >
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      {viz.title || '圖示無法即時繪製'}
                    </h5>
                  </div>
                  <p className="px-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                    此輸出為 Python 腳本，無法在瀏覽器內執行以產生圖形。請改以可渲染格式產出圖示，例如{' '}
                    <span className="font-mono text-xs">plotly_chart</span>（含資料與 layout）或{' '}
                    <span className="font-mono text-xs">python_plot</span>（含 func_str 與座標範圍，由系統轉成向量圖）。
                  </p>
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">
                        {viz.caption}
                      </p>
                    </div>
                  )}
                </div>
              );
            }
            if (viz.type === 'python_plot') {
              const pp = normalizePythonPlotViz(viz as unknown as Record<string, unknown>);
              return (
                <PythonFunctionPlotBlock
                  key={vk}
                  title={viz.title}
                  caption={viz.caption}
                  svgCode={pp.svgCode}
                  func_str={pp.func_str}
                  x_range={pp.x_range}
                  y_range={pp.y_range}
                  mode={pp.plot_mode === '2d' ? '2d' : '3d'}
                />
              );
            }
            if (viz.type === 'physics_collision' && viz.parameters?.ball_A && viz.parameters?.ball_B) {
              return (
                <div
                  key={vk}
                  className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden"
                >
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {viz.title || '碰撞示意（SVG）'}
                    </h5>
                  </div>
                  <CollisionDiagram params={viz.parameters} />
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">
                        {viz.caption}
                      </p>
                    </div>
                  )}
                </div>
              );
            }
            if (
              viz.type === 'physiology_mechanism' &&
              (viz.topic || (Array.isArray(viz.layers) && viz.layers.length > 0))
            ) {
              return (
                <div
                  key={vk}
                  className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden"
                >
                  <div className="mb-3 flex justify-between items-center px-1">
                    <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      {viz.title || '生理機制'}
                    </h5>
                  </div>
                  <PhysiologyMechanismDiagram
                    viz={{
                      category: viz.category,
                      topic: viz.topic || 'Mechanism',
                      layers: viz.layers || [],
                      visual_style: viz.visual_style,
                      interaction_enabled: viz.interaction_enabled,
                    }}
                  />
                  {viz.caption && (
                    <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">
                        {viz.caption}
                      </p>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          } catch (error) {
            console.error('[Grading Fatal Error]', error, '\nPayload:', viz);
            return null;
          }
        })}
      </div>

      {/* 化學科專用：批改完後顯示化合物結構式與 3D 模型 */}
      {(vizPayload.compounds ?? compoundsProp) && (vizPayload.compounds ?? compoundsProp)!.length > 0 && (
        <ChemCompoundViewer compounds={vizPayload.compounds ?? compoundsProp!} />
      )}
    </div>
  );
};
