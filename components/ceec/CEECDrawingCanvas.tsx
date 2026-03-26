import React from 'react';
import { PhysicsRenderer, sanitizeAiSvgCode, isParsableAiSvgMarkup } from '../PhysicsRenderer';
import { SmartSvg } from '../SmartSvg';

export interface CEECDrawingCanvasProps {
  baseImageUrl?: string | null;
  overlaySvg?: string | null;
  className?: string;
  title?: string;
}

/**
 * 作圖題唯讀預覽：底圖 + AI SVG 疊加（參數由 ceec_answer_sheet.drawing 提供）。
 */
export const CEECDrawingCanvas: React.FC<CEECDrawingCanvasProps> = ({
  baseImageUrl,
  overlaySvg,
  className = '',
  title = '作圖題預覽',
}) => {
  const raw = overlaySvg?.trim() ?? '';
  const clean = raw && isParsableAiSvgMarkup(raw) ? sanitizeAiSvgCode(raw) : '';
  const usePhysics = clean.includes('<svg');

  return (
    <div className={`mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden ${className}`}>
      <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
        <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{title}</span>
      </div>
      <div className="relative w-full min-h-[200px] bg-[var(--bg-main)]">
        {baseImageUrl ? (
          <img src={baseImageUrl} alt="" className="w-full max-h-[320px] object-contain opacity-90" />
        ) : (
          <div className="flex min-h-[200px] items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
            題目底圖（可由模型於 ceec_answer_sheet.drawing.base_image_url 提供）
          </div>
        )}
        {clean ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
            {usePhysics ? (
              <PhysicsRenderer svgCode={clean} preserveDiagramColors className="max-h-full max-w-full object-contain" />
            ) : (
              <SmartSvg svgCode={clean} className="max-h-full max-w-full" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
