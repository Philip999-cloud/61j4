/**
 * 將手寫／OCR 轉錄的 STEM 文字補上 LaTeX 界定符，讓 KaTeX 能正確顯示常見算式。
 * 若已有 $ / $$ 則不修改，避免破壞使用者或模型已格式化的內容。
 */
export function enhanceTranscriptionMathForLatex(text: string): string {
  const raw = typeof text === 'string' ? text : String(text ?? '');
  const t = raw.trim();
  if (!t) return raw;

  if (/\$/.test(t)) return raw;

  const hasTexCommand = /\\[a-zA-Z]+/.test(t);
  if (hasTexCommand) {
    const strong =
      /\\(frac|sqrt|sum|int|prod|begin|end|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|infty|partial|nabla|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|phi|psi|mathbb|mathrm|mathbf|text|left|right|bigl|bigr|overline|underline|hat|bar|vec|tilde)\b/.test(
        t
      );
    if (strong) {
      return t.includes('\n') ? `$$\n${t}\n$$` : `$${t}$`;
    }
  }

  // 單行、以符號為主的簡短算式（無反斜線）：如 x^2+1=0、F=ma
  const compact = t.replace(/\s+/g, '');
  if (t.length <= 160 && compact.length >= 3 && /^[0-9a-zA-Z+\-*/^=().,_[\]]+$/.test(compact) && /[=^]/.test(compact)) {
    return `$${t}$`;
  }

  return raw;
}
