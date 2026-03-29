import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import '../src/katex-fonts-override.css';
import 'katex/contrib/mhchem';
import { formatChemistryText } from '../utils/chemistryFormatUtils';

/** 模型偶發把同一行內公式貼極多次，導致畫面被相同 KaTeX 洗版；僅摺疊「完全相同的 $...$」連續出現。 */
function collapseAseaRunawayRepeatedMath(s: string): string {
  if (typeof s !== 'string' || s.length < 80) return s;
  const before = s.length;
  let out = s.replace(
    /(\$[^$]{1,600}\$)(\s*\1){7,}/g,
    '$1\n\n*（已摺疊連續重複之相同公式，僅保留一則）*',
  );
  out = out.replace(
    /(\$\$[\s\S]{1,8000}?\$\$)(\s*\1){4,}/g,
    '$1\n\n*（已摺疊連續重複之相同區塊公式）*',
  );
  // #region agent log
  if (out.length < before && typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7868/ingest/30be66e8-43e1-4847-8aca-d71a90266b5e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd7ef55' },
      body: JSON.stringify({
        sessionId: 'd7ef55',
        location: 'LatexRenderer.tsx:collapseRepeatedMath',
        message: 'collapsed runaway repeated math',
        data: { hypothesisId: 'H-rep', beforeLen: before, afterLen: out.length },
        timestamp: Date.now(),
        runId: 'post-fix',
      }),
    }).catch(() => {});
  }
  // #endregion
  return out;
}

interface LatexRendererProps {
  content: any;
  className?: string;
  isInline?: boolean;
}

// Error Boundary to catch rendering crashes (e.g., from malformed chemfig)
class LatexErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("LatexRenderer caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 my-2 border border-red-500 bg-red-50 text-red-700 rounded-md text-sm">
          <p className="font-bold mb-1">⚠️ 渲染錯誤 (Rendering Error)</p>
          <p>無法解析此區塊的化學結構或數學公式。這通常是因為 AI 生成了不支援的複雜格式（如 chemfig）。</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const LatexRenderer = React.memo(({ content, className = '', isInline = false }: LatexRendererProps) => {
  const safeContent = useMemo(() => {
    if (!content) return '';
    let processed = typeof content === 'string' ? content : String(content);
    
    // Added chemistry text formatting
    processed = formatChemistryText(processed);

    // 0. 移除 AI 錯誤的 Markdown 程式碼區塊標記 (例如 ```latex ... ``` 或 ```math ... ```) 導致無法解析為數學公式的問題
    processed = processed.replace(/```(?:latex|tex|math)\s*\n([\s\S]*?)```/g, '\n$1\n');
    // ```json / ```text / ```plaintext 等（語言標籤後換行）：模型常把算式或說明誤包在此；展開為正文，避免等寬「原始碼」區塊
    processed = processed.replace(/```[a-zA-Z0-9_+-]+\s*\n([\s\S]*?)```/g, '\n$1\n');
    // 無語言標籤的 ``` ... ```（模型常把算式包在內）→ 展開為正文
    processed = processed.replace(/```\s*\n([\s\S]*?)```/g, '\n$1\n');

    // 1. 基礎清洗：將常見的 AI 轉義錯誤還原
    processed = processed.replace(/\\\\\\\\/g, '\\\\'); 

    // 2. 轉換標準 LaTeX 區塊標記 \[ ... \] 為 $$ ... $$
    // 使用非貪婪匹配，並確保前後有換行符號以符合 block math 規範
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$$$\n$1\n$$$$\n');

    // 3. 轉換標準行內標記 \( ... \) 為 $ ... $
    processed = processed.replace(/\\\((.*?)\\\)/g, '$$$1$$');

    // 4. 致命錯誤修復：轉換 KaTeX 不支援的環境
    processed = processed.replace(/\\begin\{align\**\}/g, '\\begin{aligned}');
    processed = processed.replace(/\\end\{align\**\}/g, '\\end{aligned}');
    processed = processed.replace(/\\begin\{eqnarray\**\}/g, '\\begin{aligned}');
    processed = processed.replace(/\\end\{eqnarray\**\}/g, '\\end{aligned}');

    // 5. 全形空白轉換
    processed = processed.replace(/　/g, ' ');

    // 6. 處理裸露的 \begin...\end 與數學區塊內的語法錯誤
    // 將字串依據 $$ 或 $ 切割，偶數索引為一般文字，奇數索引為數學公式
    const parts = processed.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // 非數學區塊：將裸露的 \begin...\end 包裝成 $$ 區塊
        parts[i] = parts[i].replace(/(\\begin\{[a-zA-Z0-9*]+\}[\s\S]*?\\end\{[a-zA-Z0-9*]+\})/g, '\n$$$$\n$1\n$$$$\n');
        
        // 物理專屬：將裸露在一般文本中的物理單位與向量包裝成 $ 區塊
        parts[i] = parts[i].replace(/\\SI\{([^}]+)\}\{([^}]+)\}/g, '$\\SI{$1}{$2}$');
        parts[i] = parts[i].replace(/\\qty\{([^}]+)\}\{([^}]+)\}/g, '$\\qty{$1}{$2}$');
        parts[i] = parts[i].replace(/\\unit\{([^}]+)\}/g, '$\\unit{$1}$');
        parts[i] = parts[i].replace(/\\degree/g, '$\\degree$');
        parts[i] = parts[i].replace(/\\ohm/g, '$\\ohm$');
        parts[i] = parts[i].replace(/\\celsius/g, '$\\celsius$');
        parts[i] = parts[i].replace(/\\micro/g, '$\\micro$');
        parts[i] = parts[i].replace(/(?<!\\)\\vec\{([^}]+)\}/g, '$\\vec{$1}$');
      } else {
        // 數學區塊：進行語法容錯修復，避免 KaTeX 渲染崩潰 (ParseError)
        let math = parts[i];
        
        // 修正單反斜線換行 (例如矩陣中的 \ 替換為 \\)
        // 只有當 \ 後面跟著空白或換行時才替換，避免破壞正常的 LaTeX 指令 (如 \frac)
        math = math.replace(/(?<!\\)\\(?=[\s\n])/g, '\\\\');

        // 修正不平衡的 \left 和 \right
        const leftCount = (math.match(/\\left\b/g) || []).length;
        const rightCount = (math.match(/\\right\b/g) || []).length;
        if (leftCount !== rightCount) {
          // 如果不平衡，直接移除 \left 和 \right，保留其後的括號
          math = math.replace(/\\left\s*([.()\[\]|]|\\[{}|a-zA-Z]+)/g, (m, p1) => p1 === '.' ? '' : p1);
          math = math.replace(/\\right\s*([.()\[\]|]|\\[{}|a-zA-Z]+)/g, (m, p1) => p1 === '.' ? '' : p1);
        }

        // 修正不平衡的 \begin 和 \end
        const beginCount = (math.match(/\\begin\{/g) || []).length;
        const endCount = (math.match(/\\end\{/g) || []).length;
        if (beginCount !== endCount) {
           // 如果不平衡，直接移除 \begin 和 \end 標籤
          math = math.replace(/\\begin\{[a-zA-Z0-9*]+\}/g, '');
          math = math.replace(/\\end\{[a-zA-Z0-9*]+\}/g, '');
        }

        // 修正孤立的 & 符號 (不在環境內時會報錯)
        if (math.includes('&') && !math.includes('\\begin')) {
          math = math.replace(/&/g, '  ');
        }
        
        // 修正百分比符號 %，在 LaTeX 中是註解，必須跳脫
        // 確保不會重複跳脫已經是 \% 的情況
        math = math.replace(/(?<!\\)%/g, '\\%');

        parts[i] = math;
      }
    }
    processed = parts.join('');

    // 7. 物理專屬修復：將 KaTeX 不支援的 siunitx 語法與單位替換為標準 LaTeX
    processed = processed.replace(/\\SI\{([^}]+)\}\{([^}]+)\}/g, '$1\\,\\mathrm{$2}');
    processed = processed.replace(/\\qty\{([^}]+)\}\{([^}]+)\}/g, '$1\\,\\mathrm{$2}');
    processed = processed.replace(/\\unit\{([^}]+)\}/g, '\\mathrm{$1}');
    processed = processed.replace(/\\degree/g, '^\\circ');
    processed = processed.replace(/\\ohm/g, '\\Omega');
    processed = processed.replace(/\\celsius/g, '^\\circ\\mathrm{C}');
    processed = processed.replace(/\\micro/g, '\\mu');

    processed = collapseAseaRunawayRepeatedMath(processed);

    return processed;
  }, [content]);

  if (!content) return null;

  return (
    <LatexErrorBoundary>
      <div className={`latex-renderer-container max-w-full overflow-x-auto ${className} ${isInline ? 'inline text-inherit' : 'text-[var(--text-primary)]'}`}>
        <style>{`
          /* Custom error styling for KaTeX parse errors */
          .katex-error {
            color: #ef4444 !important; /* Red color to indicate error but keep it readable */
            font-family: monospace;
            background: var(--bg-card);
            padding: 0.1em 0.3em;
            border-radius: 0.25rem;
            border: 1px solid #fca5a5;
            white-space: normal;
            word-break: break-all;
            display: inline-block;
          }
          /* Ensure block math doesn't overflow */
          .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0.75rem 0;
            margin: 0.75rem 0;
            max-width: 100%;
            display: block;
            text-align: center;
          }
          .latex-renderer-container .katex { font-size: 1.06em; }
          @media (min-width: 640px) {
            .latex-renderer-container .katex-display .katex { font-size: 1.12em; }
          }
        `}</style>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          // throwOnError: false is CRITICAL. It tells KaTeX to render the raw string in a <span class="katex-error"> instead of throwing a JS error that crashes React.
          rehypePlugins={[
            [
              rehypeKatex,
              {
                strict: false,
                trust: true,
                throwOnError: false,
                /* displayMode 由 remark-math 的 math-display / math-inline 節點決定；$$ 為區塊 display */
              },
            ],
          ]}
          components={{
            p: ({ node, ...props }) => (
              <p
                className={`${isInline ? 'inline' : 'mb-8 leading-loose'} last:mb-0 break-words`}
                {...props}
              />
            ),
            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-6 mb-3" {...props} />,
            h4: ({ node, ...props }) => <h4 className="text-lg font-semibold mt-5 mb-2" {...props} />,
            pre: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                <pre className="p-4 text-sm font-mono text-[var(--text-primary)] m-0" {...props} />
              </div>
            ),
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4 w-full rounded-lg border border-[var(--border-color)]">
                <table
                  className="w-full text-center border-collapse text-sm bg-[var(--bg-card)] text-[var(--text-primary)]"
                  {...props}
                />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-[var(--bg-main)]" {...props} />,
            tbody: ({ node, ...props }) => <tbody {...props} />,
            tr: ({ node, ...props }) => <tr className="border-b border-[var(--border-color)]" {...props} />,
            th: ({ node, ...props }) => (
              <th className="border border-[var(--border-color)] p-2 font-bold text-[var(--text-primary)]" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="border border-[var(--border-color)] p-2 text-[var(--text-primary)]" {...props} />
            ),
            code: ({ node, className, children, ...props }: any) => {
              const isBlock = /language-(\w+)/.test(className || '') || String(children).includes('\n');
              
              if (isBlock) {
                return <code className={className} {...props}>{children}</code>;
              }
              
              return <code className="px-1.5 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-primary)] text-sm font-mono border border-[var(--border-color)]" {...props}>{children}</code>;
            }
          }}
        >
          {safeContent}
        </ReactMarkdown>
      </div>
    </LatexErrorBoundary>
  );
});

LatexRenderer.displayName = 'LatexRenderer'; // 開發工具除錯用

export default LatexRenderer;
