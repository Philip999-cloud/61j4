/**
 * 上架／筆電打包前：確認 .env 內會被打進 bundle 的關鍵變數已填寫。
 * 由 npm run pack:laptop / pack 呼叫；單獨執行：node scripts/check-release-env.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function fail(msg) {
  console.error(`[check-release-env] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  fail('找不到專案根目錄的 .env。請複製 .env.example 為 .env 並填入金鑰後再建置。');
}

const env = parseEnv(fs.readFileSync(envPath, 'utf8'));

const gemini = (env.GEMINI_API_KEY ?? '').trim();
if (!gemini) {
  fail('GEMINI_API_KEY 為空。建置後 geminiService 等無法於執行期呼叫模型；請在 .env 填入。');
}
if (
  gemini === 'your_gemini_api_key' ||
  /^your[_-]?gemini/i.test(gemini) ||
  /^placeholder$/i.test(gemini)
) {
  fail('GEMINI_API_KEY 仍為示例／占位字。請改為 Google AI Studio 或 Cloud 取得的真實金鑰。');
}

const fb = (env.VITE_FIREBASE_API_KEY ?? '').trim();
if (!fb) {
  fail(
    'VITE_FIREBASE_API_KEY 為空。與 vite.config 正式建置規則一致：請填入 Firebase 主控台「專案設定 → 一般」的 apiKey。'
  );
}
if (fb.includes('YOUR_NEW_') || /^your[_-]?firebase/i.test(fb)) {
  fail('VITE_FIREBASE_API_KEY 仍為占位字。請改為 Firebase 設定中的 apiKey。');
}

console.log('[check-release-env] GEMINI_API_KEY、VITE_FIREBASE_API_KEY 已通過基本檢查。');
