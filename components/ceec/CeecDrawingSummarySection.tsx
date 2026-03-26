import React, { useMemo } from 'react';
import type { StemSubScore } from '../../types';
import { CEECDrawingCanvas } from './CEECDrawingCanvas';

function hasDrawingContent(d: StemSubScore['ceec_answer_sheet']): boolean {
  if (!d || typeof d !== 'object') return false;
  const dr = d.drawing;
  if (!dr || typeof dr !== 'object') return false;
  const url = typeof dr.base_image_url === 'string' && dr.base_image_url.trim().length > 0;
  const svg = typeof dr.overlay_svg === 'string' && dr.overlay_svg.trim().length > 0;
  return url || svg;
}

/**
 * 結果頁卷層：快速瀏覽各小題作圖預覽（與詳解末段 CeecAnswerSheetFooter 並存，不重複改動策略 DOM）。
 */
export const CeecDrawingSummarySection: React.FC<{ subs: StemSubScore[] }> = ({ subs }) => {
  const items = useMemo(
    () =>
      subs
        .map((sub) => ({ sub, drawing: sub.ceec_answer_sheet?.drawing }))
        .filter((x) => hasDrawingContent(x.sub.ceec_answer_sheet ?? null)),
    [subs]
  );

  if (items.length === 0) return null;

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl ring-1 ring-white/5 transition-colors duration-300">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-4">
          作圖題預覽摘要（卷首）
        </h3>
        <div className="space-y-6">
          {items.map(({ sub, drawing }, idx) => (
            <div key={`ceec-draw-${sub.sub_id ?? idx}`}>
              <p className="mb-2 text-xs font-bold text-[var(--text-primary)]">
                {sub.sub_id ? `小題 ${sub.sub_id}` : '小題'}
              </p>
              <CEECDrawingCanvas
                baseImageUrl={drawing?.base_image_url}
                overlaySvg={drawing?.overlay_svg}
                title="作圖疊加預覽"
                className="mt-0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
