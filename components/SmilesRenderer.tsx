import React, { useEffect, useRef, useState } from 'react';

// WASM 路徑：使用完整 URL 確保 dev/build 皆可正確載入
const getRDKitWasmPath = () => {
  if (typeof window !== 'undefined') {
    const base = import.meta.env.BASE_URL || './';
    return new URL(base + 'RDKit_minimal.wasm', window.location.href).href;
  }
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/RDKit_minimal.wasm';
};

interface SmilesRendererProps {
  smiles: string;
  className?: string;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}

// Global RDKit instance to avoid reloading WASM
let RDKitModule: any = null;
let initPromise: Promise<any> | null = null;

const getRDKit = async () => {
  if (RDKitModule) return RDKitModule;
  if (!initPromise) {
    // Dynamically import RDKit to avoid blocking the main thread during initial load
    initPromise = import('@rdkit/rdkit').then((module) => {
      // Handle both default export and module.exports
      const initRDKitModule = module.default || (module as any);
      return initRDKitModule({
        locateFile: () => getRDKitWasmPath(),
      }).then((instance: any) => {
        RDKitModule = instance;
        return instance;
      });
    });
  }
  return initPromise;
};

export const SmilesRenderer: React.FC<SmilesRendererProps> = ({
  smiles,
  className = '',
  width = 300,
  height = 300,
  theme = 'light',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    let mol: any = null;

    // 防呆：smiles 為空或不存在時，不丟給 RDKit 解析，顯示優雅的無資料狀態
    if (!smiles || typeof smiles !== 'string' || smiles.trim() === '') {
      if (isMounted) {
        setIsLoading(false);
        setError('無資料');
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return () => {};
    }

    const renderMolecule = async () => {
      if (!containerRef.current) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const rdkit = await getRDKit();
        if (!isMounted) return;

        // Clear previous render
        containerRef.current.innerHTML = '';

        // Create molecule from SMILES
        mol = rdkit.get_mol(smiles);
        
        if (!mol || !mol.is_valid()) {
          throw new Error('Invalid SMILES string');
        }

        // Determine theme based on the prop or system preference
        const isDarkMode = theme === 'dark' || document.documentElement.classList.contains('dark');
        
        // Setup drawing details for high-quality rendering
        const details = {
          width: width,
          height: height,
          bondLineWidth: 1.5,
          addStereoAnnotation: true,
          clearBackground: false, // Transparent background
          comicMode: false,
          drawMolecules: true,
        };

        // Generate SVG：使用 get_svg 避免 get_svg_with_highlights 在無反白陣列時失敗
        let svgString: string;
        try {
          svgString = mol.get_svg(JSON.stringify(details));
        } catch {
          svgString = mol.get_svg();
        }
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svgString;
          
          // Ensure SVG scales properly within the container while maintaining aspect ratio
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.maxWidth = `${width}px`;
            svgElement.style.maxHeight = `${height}px`;
            svgElement.style.objectFit = 'contain';
            
            // Apply CSS filter for dark mode to invert black lines to white 
            // while preserving colors (hue-rotate)
            if (isDarkMode) {
              svgElement.style.filter = 'invert(1) hue-rotate(180deg) brightness(1.5)';
            }
          }
        }
      } catch (err) {
        console.error('Failed to render SMILES with RDKit:', err);
        if (isMounted) {
          setError('分子圖形引擎載入中或發生錯誤...');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
        // CRITICAL: Manual memory management for WebAssembly
        if (mol) {
          try {
            mol.delete();
          } catch (e) {
            // Ignore deletion errors
          }
        }
      }
    };

    renderMolecule();

    return () => {
      isMounted = false;
      // Cleanup in case component unmounts before rendering finishes
      if (mol) {
        try {
          mol.delete();
        } catch (e) {
          // Ignore deletion errors
        }
      }
    };
  }, [smiles, width, height, theme]);

  if (error) {
    return (
      <div className={`flex justify-center items-center p-4 rounded-md bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 ${className}`}>
        <span className="text-zinc-500 dark:text-zinc-400 text-xs text-center">{error}</span>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center overflow-hidden bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 z-10 rounded-xl">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div ref={containerRef} className="flex justify-center items-center w-full h-full" />
    </div>
  );
};

export default SmilesRenderer;
