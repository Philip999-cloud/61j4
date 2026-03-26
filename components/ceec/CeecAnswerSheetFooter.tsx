import React from 'react';
import type { CeecAnswerSheetSpec } from '../../types';
import { CeecMultipleChoice } from './CeecMultipleChoice';
import { CEECFillInBlank } from './CEECFillInBlank';
import { CEECDrawingCanvas } from './CEECDrawingCanvas';
import { CEECAnswerGridTable } from './CEECAnswerGridTable';
import LatexRenderer from '../LatexRenderer';

function clampLines(n: number | undefined | null, fallback: number): number {
  if (n == null || !Number.isFinite(n)) return fallback;
  return Math.min(12, Math.max(1, Math.floor(Number(n))));
}

interface Props {
  spec?: CeecAnswerSheetSpec | null;
  subId?: string;
  /** 無 ceec_answer_sheet 或僅有簡答時，由標準解產生的填答格式範例 */
  exampleFormatHint?: string;
}

/**
 * 掛於每題 STEM 解析末端：學測自然科優先矩陣表 → 申論欄位 → 選擇題 → 作圖 → 參考解答（不含底端擬真虛線列）。
 */
export const CeecAnswerSheetFooter: React.FC<Props> = ({
  spec,
  subId,
  exampleFormatHint,
}) => {
  const hasMcq =
    spec &&
    spec.mcq &&
    Array.isArray(spec.mcq.options) &&
    spec.mcq.options.length > 0 &&
    (spec.mode === 'mcq' || spec.mode === 'mixed');

  const showMcq = Boolean(hasMcq);

  const hasGrid =
    !!spec?.answer_grid &&
    Array.isArray(spec.answer_grid.row_labels) &&
    spec.answer_grid.row_labels.length > 0 &&
    Array.isArray(spec.answer_grid.col_labels) &&
    spec.answer_grid.col_labels.length > 0;

  const responseFieldLabels =
    spec?.response_field_labels && spec.response_field_labels.length > 0
      ? spec.response_field_labels.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [];

  const hasResponseFields = responseFieldLabels.length > 0;
  const linesPerField = Math.min(8, Math.max(1, clampLines(spec?.lines_per_response_field, 3) || 3));

  const hint = typeof exampleFormatHint === 'string' ? exampleFormatHint.trim() : '';

  const drawing = spec?.drawing;
  const showDrawing =
    !!drawing &&
    ((typeof drawing.base_image_url === 'string' && drawing.base_image_url.trim().length > 0) ||
      (typeof drawing.overlay_svg === 'string' && drawing.overlay_svg.trim().length > 0));

  return (
    <div className="mt-8 relative z-10 rounded-[1.25rem] border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/80 p-5 transition-colors">
      <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex flex-wrap items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--text-secondary)] opacity-60" />
        大考擬真作答區（CEEC）
        {subId ? <span className="font-mono text-[9px] opacity-80">{subId}</span> : null}
      </h5>

      {hasGrid && spec?.answer_grid ? <CEECAnswerGridTable grid={spec.answer_grid} /> : null}

      {hasResponseFields ? (
        <div className="mb-6 space-y-5">
          <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
            題本申論／簡答欄位（擬真）
          </h6>
          {responseFieldLabels.map((label, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/60 p-3">
              <div className="text-xs font-black text-[var(--text-primary)] mb-2">{label}</div>
              <CEECFillInBlank lineCount={linesPerField} placeholders={undefined} />
            </div>
          ))}
        </div>
      ) : null}

      {showMcq && spec?.mcq ? (
        <div className="mb-6">
          <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2">
            選擇題選項（擬真）
          </h6>
          <CeecMultipleChoice mcq={spec.mcq} showSolution />
        </div>
      ) : null}

      {showDrawing && drawing ? (
        <CEECDrawingCanvas
          baseImageUrl={drawing.base_image_url}
          overlaySvg={drawing.overlay_svg}
          title="作圖題預覽（AI 疊加）"
        />
      ) : null}

      {hint ? (
        <div className="mb-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <h6 className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">
            參考解答（對照欄位填寫方式）
          </h6>
          <div className="text-sm leading-relaxed text-[var(--text-primary)]">
            <LatexRenderer content={hint} />
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] text-[var(--text-secondary)] leading-relaxed">
        {!spec
          ? '此區供對照大考格式；學測自然科請於 JSON 帶入 answer_grid、response_field_labels 與 ceec_answer_sheet 其餘欄位。未帶規格時，以上方標準解自動產生參考解答。'
          : '呈現順序：勾選表 → 申論欄位 → 選擇題／作圖 → 參考解答。欄位請與題本對齊。'}
      </p>
    </div>
  );
};
