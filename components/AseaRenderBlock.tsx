import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { AseaRenderRequest } from '../utils/aseaVizDsl';
import { isParsableAiSvgMarkup, PhysicsRenderer, sanitizeAiSvgCode } from './PhysicsRenderer';
import { LatexRenderer } from './LatexRenderer';

type LocalRenderRequest = {
  engine: string;
  topic: string;
  data: Record<string, unknown>;
  styling: Record<string, unknown>;
  apply_layout: boolean;
};

function toLocal(props: AseaRenderRequest): LocalRenderRequest {
  return {
    engine: props.engine,
    topic: props.topic,
    data: (props.data && typeof props.data === 'object' && !Array.isArray(props.data)
      ? props.data
      : {}) as Record<string, unknown>,
    styling: (props.styling && typeof props.styling === 'object' && !Array.isArray(props.styling)
      ? props.styling
      : {}) as Record<string, unknown>,
    apply_layout: Boolean(props.apply_layout),
  };
}

function AseaRenderSkeleton() {
  return (
    <div
      className="w-full space-y-4 p-6 animate-pulse"
      role="status"
      aria-label="圖表載入中"
    >
      <div className="h-3 bg-[var(--border-color)] rounded-full w-2/3 mx-auto opacity-70" />
      <div className="h-36 bg-[var(--border-color)]/50 rounded-2xl w-full" />
      <div className="flex gap-2 justify-center">
        <div className="h-2.5 w-24 bg-[var(--border-color)]/60 rounded-full" />
        <div className="h-2.5 w-16 bg-[var(--border-color)]/40 rounded-full" />
      </div>
      <div className="flex justify-center pt-2">
        <Loader2 className="w-6 h-6 text-[var(--text-secondary)] opacity-40 animate-spin" />
      </div>
    </div>
  );
}

function AseaRenderFallback({
  errorMessage,
  engine,
  data,
}: {
  errorMessage: string;
  engine: string;
  data: Record<string, unknown>;
}) {
  const eqRaw = data.equations;
  const firstEq =
    Array.isArray(eqRaw) && eqRaw.length > 0 && typeof eqRaw[0] === 'string' ? eqRaw[0] : null;
  const smiles = typeof data.molecule_string === 'string' ? data.molecule_string : null;
  const latexAttempt =
    engine === 'math' && firstEq
      ? `\n$$\n${String(firstEq).replace(/\*\*/g, '^')}\n$$\n`
      : null;

  return (
    <div className="flex flex-col gap-4 py-8 px-4 text-center max-w-lg mx-auto">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">
          無法生成圖表
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed whitespace-pre-wrap">
          {errorMessage}
        </p>
      </div>
      {latexAttempt && (
        <div className="text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            數學式降級預覽（LaTeX）
          </p>
          <div className="text-sm text-[var(--text-primary)] prose prose-sm dark:prose-invert max-w-none">
            <LatexRenderer content={latexAttempt} />
          </div>
        </div>
      )}
      {smiles && engine === 'chemistry' && (
        <div className="text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            SMILES（文字備援）
          </p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all text-[var(--text-primary)]">
            {smiles}
          </pre>
        </div>
      )}
    </div>
  );
}

function AseaSvg({
  svgCode,
  engine,
  data,
}: {
  svgCode: string;
  engine: string;
  data: Record<string, unknown>;
}) {
  const clean = useMemo(() => sanitizeAiSvgCode(svgCode), [svgCode]);
  const ok = useMemo(() => isParsableAiSvgMarkup(clean), [clean]);
  if (!ok) {
    return (
      <AseaRenderFallback
        errorMessage="後端回傳的 SVG 無法通過安全解析，已阻擋顯示。"
        engine={engine}
        data={data}
      />
    );
  }
  return (
    <div className="w-full min-h-[180px] overflow-visible smart-svg-foreignobject-safe">
      <PhysicsRenderer svgCode={clean} preserveDiagramColors className="w-full" />
    </div>
  );
}

function getAseaRenderApiBase(): string {
  const a = import.meta.env.VITE_ASEA_RENDER_API_URL;
  if (a && String(a).trim()) return String(a).trim().replace(/\/$/, '');
  const p = import.meta.env.VITE_PYTHON_PLOT_API_URL;
  if (p && String(p).trim()) return String(p).trim().replace(/\/$/, '').replace(/\/api\/python-plot$/, '');
  return '';
}

export interface AseaRenderBlockProps extends AseaRenderRequest {
  title?: string;
  caption?: string;
  /** 若後端已內嵌於模型回應，略過 fetch */
  svgCode?: string;
}

export const AseaRenderBlock: React.FC<AseaRenderBlockProps> = ({
  engine: propEngine,
  topic: propTopic,
  data: propData,
  styling: propStyling,
  apply_layout: propApplyLayout,
  title,
  caption,
  svgCode: initialSvg,
}) => {
  const propsSnapshot = useMemo(
    () =>
      toLocal({
        engine: propEngine,
        topic: propTopic,
        data: propData,
        styling: propStyling,
        apply_layout: propApplyLayout,
      }),
    [propEngine, propTopic, propData, propStyling, propApplyLayout],
  );

  const [active, setActive] = useState<LocalRenderRequest>(propsSnapshot);
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(propsSnapshot, null, 2));
  const [editorOpen, setEditorOpen] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);

  const [svg, setSvg] = useState<string | null>(initialSvg?.trim() || null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  useEffect(() => {
    setActive(propsSnapshot);
    setJsonDraft(JSON.stringify(propsSnapshot, null, 2));
    setParseErr(null);
    setFetchNonce(0);
  }, [propsSnapshot]);

  useEffect(() => {
    if (initialSvg?.trim() && fetchNonce === 0) {
      setSvg(initialSvg.trim());
      setErr(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setErr(null);
    if (!initialSvg?.trim() || fetchNonce > 0) setSvg(null);

    const base = getAseaRenderApiBase();
    const url = base ? `${base}/api/v1/render` : '/api/v1/render';

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ac.signal,
      body: JSON.stringify({
        engine: active.engine,
        topic: active.topic,
        data: active.data,
        styling: active.styling,
        apply_layout: active.apply_layout,
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = (body as { detail?: string }).detail || res.statusText;
          throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
        }
        const s = (body as { svg?: string }).svg;
        if (!s || typeof s !== 'string') throw new Error('Missing svg in response');
        setSvg(s);
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setErr(e instanceof Error ? e.message : '渲染失敗');
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [active, initialSvg, fetchNonce]);

  const applyJsonAndRerender = () => {
    setParseErr(null);
    try {
      const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
      const eng = typeof parsed.engine === 'string' ? parsed.engine : '';
      const top = typeof parsed.topic === 'string' ? parsed.topic : '';
      const dat =
        parsed.data != null && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : {};
      const sty =
        parsed.styling != null &&
        typeof parsed.styling === 'object' &&
        !Array.isArray(parsed.styling)
          ? (parsed.styling as Record<string, unknown>)
          : {};
      const al = Boolean(parsed.apply_layout);
      if (!eng || !top) {
        setParseErr('JSON 需包含字串欄位 engine 與 topic');
        return;
      }
      setActive({ engine: eng, topic: top, data: dat, styling: sty, apply_layout: al });
      setFetchNonce((n) => n + 1);
    } catch {
      setParseErr('JSON 格式不正確');
    }
  };

  const resetToModel = () => {
    setJsonDraft(JSON.stringify(propsSnapshot, null, 2));
    setActive(propsSnapshot);
    setParseErr(null);
    setFetchNonce((n) => n + 1);
  };

  return (
    <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden">
      <div className="mb-3 flex justify-between items-center px-1 gap-2 flex-wrap">
        <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          {title || `ASEA 引擎 · ${active.engine}`}
        </h5>
        <button
          type="button"
          onClick={() => setEditorOpen((o) => !o)}
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]"
        >
          {editorOpen ? '收合 DSL' : '編輯 DSL'}
        </button>
      </div>

      {editorOpen && (
        <div className="mb-4 space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
            修改 JSON 後按「套用並重新渲染」會再次 POST 至 <code className="text-[10px]">/api/v1/render</code>
            （二次編輯／參數微調）。
          </p>
          <textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            className="w-full min-h-[140px] text-xs font-mono rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] p-2"
            spellCheck={false}
            aria-label="ASEA render DSL JSON"
          />
          {parseErr && <p className="text-xs text-red-500">{parseErr}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyJsonAndRerender}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              套用並重新渲染
            </button>
            <button
              type="button"
              onClick={resetToModel}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
            >
              還原模型輸出
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-[var(--border-color)]/60 bg-[var(--bg-main)] min-h-[200px] flex items-center justify-center p-2">
        {loading && <AseaRenderSkeleton />}
        {!loading && err && (
          <>
            <AseaRenderFallback errorMessage={err} engine={active.engine} data={active.data} />
            <span className="sr-only">
              後端未啟動時請執行 uvicorn；並確認 Vite 代理 /api/v1 或設定 VITE_ASEA_RENDER_API_URL
            </span>
          </>
        )}
        {!loading && !err && svg && (
          <AseaSvg svgCode={svg} engine={active.engine} data={active.data} />
        )}
        {!loading && !err && !svg && (
          <span className="text-[var(--text-secondary)] text-sm">無可顯示內容</span>
        )}
      </div>
      {caption && (
        <div className="mt-3 px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
          <p className="text-[var(--text-secondary)] text-xs text-center font-medium leading-relaxed">{caption}</p>
        </div>
      )}
    </div>
  );
};
