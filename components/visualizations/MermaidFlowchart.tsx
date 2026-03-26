import React, { useEffect, useRef, useState } from 'react';

export const MermaidFlowchart: React.FC<{ definition: string; className?: string }> = ({
  definition,
  className = '',
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !definition.trim()) return;
    let cancelled = false;
    setErr(null);
    host.innerHTML = '';

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDark ? 'dark' : 'default',
        });
        const id = `mmd-${Math.random().toString(36).slice(2, 11)}`;
        const { svg } = await mermaid.render(id, definition);
        if (!cancelled && host) host.innerHTML = svg;
      } catch (e) {
        if (!cancelled) {
          setErr('流程圖無法渲染');
          console.warn('[MermaidFlowchart]', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [definition]);

  if (!definition.trim()) return null;

  return (
    <div className={`w-full ${className}`}>
      {err ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {err}
        </p>
      ) : null}
      <div
        ref={hostRef}
        className="mermaid-host overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-sm [&_svg]:mx-auto [&_svg]:max-w-full"
      />
    </div>
  );
};
