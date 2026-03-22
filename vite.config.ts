import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';
import { katexFontsPlugin } from './vite-plugin-katex-fonts';

// 相對路徑給 vite-plugin-static-copy（Windows 上絕對路徑偶發找不到檔案）
const rdkitWasmRel =
  ['node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm', 'public/RDKit_minimal.wasm'].find((rel) =>
    fs.existsSync(path.resolve(__dirname, rel)),
  ) ?? 'public/RDKit_minimal.wasm';
const rdkitWasmPath = path.resolve(__dirname, rdkitWasmRel);

/**
 * 正式建置的 index.html 預設會帶 crossorigin；以 file:// 開本機資料夾時，
 * 來源為 null，Chrome 會依 CORS 擋下 CSS/JS。拿掉後可雙擊 index.html 測試；
 * 仍建議用 npm run serve:laptop（HTTP）以符合模組與 iframe 等行為。
 */
function stripBuiltHtmlCrossoriginPlugin(): Plugin {
  return {
    name: 'strip-built-html-crossorigin',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/gi, '');
      },
    },
  };
}

/** 瀏覽器仍會請求 /favicon.ico；導向既有 SVG，避免 preview 404 */
function faviconIcoRedirectPlugin(): Plugin {
  return {
    name: 'favicon-ico-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = req.url?.split('?')[0];
        if (p === '/favicon.ico') {
          res.statusCode = 302;
          res.setHeader('Location', '/favicon.svg');
          res.end();
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = req.url?.split('?')[0];
        if (p === '/favicon.ico') {
          res.statusCode = 302;
          res.setHeader('Location', '/favicon.svg');
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        // 修正本地開發的 COOP 錯誤（供 Firebase Auth / Google 彈出視窗存取 window.close）
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
      fs: {
        allow: ['.', path.resolve(__dirname, 'node_modules')],
      },
    },
    preview: {
      port: 4173,
      host: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
      // 與 Vercel 相同：前端用 /api/*，由後端轉發。本機請另開終端跑 `vercel dev`（預設常為 :3000）
      proxy: (() => {
        const target =
          env.VERCEL_DEV_API_ORIGIN?.trim() || 'http://127.0.0.1:3000';
        if (!target) return undefined;
        return {
          '/api': { target, changeOrigin: true },
        };
      })(),
    },
    plugins: [
      faviconIcoRedirectPlugin(),
      stripBuiltHtmlCrossoriginPlugin(),
      react(),
      svgr({
        svgrOptions: { exportType: 'default' },
        include: '**/*.svg?react',
      }),
      wasm(),
      topLevelAwait(),
      // Dev 模式：直接從 node_modules 讀字型，fs.readFileSync + res.end 繞過中間層
      { ...katexFontsPlugin(), enforce: 'pre' },
      viteStaticCopy({
        targets: [
          {
            src: rdkitWasmRel,
            dest: '.',
          },
          // 修正 KaTeX 字型 404 / OTS error：Ketcher 套件的 KaTeX 從 /fonts/ 讀字型，
          // 若路徑不存在會回傳 HTML 404，導致 OTS parsing error (0x3C3F786D = <?xm)
          {
            src: 'node_modules/katex/dist/fonts/*',
            dest: 'fonts',
          },
        ],
      }),
      // Dev 模式：確保 RDKit wasm 可透過 /RDKit_minimal.wasm 存取（優先於其他 middleware）
      {
        name: 'serve-rdkit-wasm',
        enforce: 'pre',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/RDKit_minimal.wasm') || req.url?.startsWith('./RDKit_minimal.wasm')) {
              if (fs.existsSync(rdkitWasmPath)) {
                res.setHeader('Content-Type', 'application/wasm');
                fs.createReadStream(rdkitWasmPath).pipe(res);
                return;
              }
            }
            next();
          });
        },
      },
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      global: 'window'
    },
    resolve: {
      dedupe: ['immutable'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // 修正字型 OTS 錯誤：確保 wasm/字型檔被正確處理
    assetsInclude: ['**/*.wasm'],
    build: {
      // 降低建置峰值記憶體，避免 Vercel 等 8GB 容器在 minify 大 chunk 時 SIGKILL
      reportCompressedSize: false,
      rollupOptions: {
        maxParallelFileOps: 1,
        output: {
          manualChunks: {
            ketcher: ['ketcher-react', 'ketcher-standalone', 'ketcher-core'],
          },
          // 確保字型資源不被 inline，保持獨立檔案
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name ?? '';
            if (/\.(woff2?|ttf|otf|eot)$/.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    optimizeDeps: {
      include: ['acorn', 'immutable', 'draft-js'],
      exclude: ['@rdkit/rdkit'],
    },
    test: {
      environment: 'jsdom',
      include: ['**/*.test.{ts,tsx}'],
    },
  };
});
