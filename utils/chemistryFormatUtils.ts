/**
 * 化學／計量表相關的前端防呆格式化（補強 OCR 未輸出 array 時的顯示）
 */

const ICE_LABEL_RE =
  /(?:反應[式前後]|變化量|初(?:態|始)?|末(?:態)?|平衡|ICE|變化|係數)/;

/** 列是否像「多欄以大量空白分隔」的對齊列 */
function isSpaceAlignedRow(line: string): boolean {
  const t = line.trim();
  if (t.length < 3) return false;
  if (/^\$\$[\s\S]*\$\$$/.test(t)) return false;
  return /\S+\s{2,}\S+/.test(t);
}

function escapeCellForArray(cell: string): string {
  let c = cell.trim();
  if (!c) return '';
  const escapeTextBody = (s: string) =>
    s
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([%#&$])/g, '\\$1')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}');
  if (/[一-龥ぁ-ゔァ-ヴ]/.test(c)) {
    return `\\text{${escapeTextBody(c)}}`;
  }
  c = c.replace(/%/g, '\\%').replace(/#/g, '\\#');
  if (/^[-+]?[\d.]+$/.test(c)) return c;
  if (/^[+\-−]\s*[\d.]+$/.test(c.replace(/−/g, '-'))) {
    return c.replace(/−/g, '-').replace(/\s+/g, '');
  }
  return `\\text{${escapeTextBody(c)}}`;
}

/**
 * 將「多行 + 連續空白分欄」的純文字計量表，嘗試轉成 \\begin{array} ... \\end{array}（外層不含 $$，由 LatexRenderer 包裝）
 */
export function autoAlignIceTable(text: string): string {
  if (!text || typeof text !== 'string') return text;
  if (text.includes('\\begin{array}')) return text;

  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const start = i;
    let runLen = 0;
    let labelHits = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const t = raw.trim();
      if (!t) break;
      if (t.startsWith('$$') || t.includes('\\begin{')) break;
      if (!isSpaceAlignedRow(raw)) break;
      if (ICE_LABEL_RE.test(t)) labelHits++;
      runLen++;
      i++;
    }

    if (runLen >= 3 && labelHits >= 1) {
      const blockLines = lines.slice(start, start + runLen);
      const rows = blockLines.map((ln) =>
        ln.trim().split(/\s{2,}/).map((s) => s.trim())
      );
      const ncols = Math.max(...rows.map((r) => r.length), 0);
      if (ncols >= 3) {
        const headerCells = [...rows[0]];
        while (headerCells.length < ncols) headerCells.push('');
        
        // Ensure standard markdown table formatting
        const mdHeader = `| ${headerCells.map(c => c.replace(/\\|/g, '\\|')).join(' | ')} |`;
        const mdDivider = `| ${headerCells.map(() => '---').join(' | ')} |`;
        const mdBody = rows.slice(1).map((cells) => {
            const padded = [...cells];
            while (padded.length < ncols) padded.push('');
            return `| ${padded.map(c => c.replace(/\\|/g, '\\|')).join(' | ')} |`;
        }).join('\n');
        
        out.push(''); // Blank line before
        out.push(`${mdHeader}\n${mdDivider}\n${mdBody}`);
        out.push(''); // Blank line after
        continue;
      }
    }

    if (start < i) {
      for (let j = start; j < i; j++) out.push(lines[j]);
      continue;
    }

    out.push(lines[i]);
    i++;
  }

  return out.join('\n');
}

export const formatChemistryText = (text: any): string => {
  if (!text) return '';
  const strText = typeof text === 'string' ? text : String(text);
  return autoAlignIceTable(strText);
};
