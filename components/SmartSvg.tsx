import React, { useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  isParsableAiSvgMarkup,
  PhysicsRenderer,
  sanitizeAiSvgCode,
  tryRepairAiSvgMarkupForDisplay,
} from './PhysicsRenderer';

/**
 * Campbell 級教材 SVG：先 DOMPurify（與 PhysicsRenderer 相同設定）再 DOMParser 驗證，避免 XSS 與不合法 XML 導致白屏；
 * 外層 overflow:visible 減輕 Safari 對 foreignObject 的裁切問題。
 */
export const SmartSvg: React.FC<{ svgCode: string; className?: string }> = ({ svgCode, className = '' }) => {
  const cleanSvg = useMemo(
    () => sanitizeAiSvgCode(typeof svgCode === 'string' ? svgCode : String(svgCode ?? '')),
    [svgCode]
  );
  const displaySvg = useMemo(() => {
    if (isParsableAiSvgMarkup(cleanSvg)) return cleanSvg;
    return tryRepairAiSvgMarkupForDisplay(cleanSvg);
  }, [cleanSvg]);
  const svgValid = displaySvg.length > 0;

  if (!svgValid) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 py-8 text-zinc-400 text-sm ${className}`}
        style={{ overflow: 'visible' }}
      >
        <ImageIcon className="w-10 h-10 opacity-40" />
        <span>圖形生成過於複雜，無法顯示</span>
      </div>
    );
  }

  return (
    <div
      className="smart-svg-foreignobject-safe flex w-full min-w-0 min-h-[200px] flex-col items-stretch justify-center overflow-x-auto overflow-y-visible [&_.physics-renderer-root]:w-full [&_.physics-renderer-root]:overflow-x-auto [&_.physics-renderer-root]:overflow-y-visible"
    >
      <PhysicsRenderer svgCode={displaySvg} preserveDiagramColors className={className} />
    </div>
  );
};
