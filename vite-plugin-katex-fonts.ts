// vite-plugin-katex-fonts.ts
// 放在專案根目錄，在 vite.config.ts 裡 import 使用
//
// 原理：直接攔截 /fonts/* 請求，從 node_modules/katex/dist/fonts/ 讀取真實檔案回傳，
// 並明確設定 Content-Type，完全繞過任何中間層可能造成的 HTML 回應。

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

const MIME: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
};

export function katexFontsPlugin(): Plugin {
  const fontsDir = path.resolve(
    process.cwd(),
    'node_modules/katex/dist/fonts'
  );

  return {
    name: 'vite-plugin-katex-fonts',
    apply: 'serve', // dev 模式才啟用
    configureServer(server) {
      server.middlewares.use('/fonts', (req, res, next) => {
        const fileName = path.basename((req.url || '').split('?')[0] || '');
        const filePath = path.join(fontsDir, fileName);
        const ext = path.extname(fileName).toLowerCase();
        const mime = MIME[ext];

        if (!mime) return next();

        if (!fs.existsSync(filePath)) {
          console.warn(`[katex-fonts] 找不到字型：${filePath}`);
          return next();
        }

        try {
          const data = fs.readFileSync(filePath);
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.end(data);
        } catch (e) {
          console.error(`[katex-fonts] 讀取失敗：${filePath}`, e);
          next();
        }
      });
    },
  };
}
