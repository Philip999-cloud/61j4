// api/generate-image.ts
// Vercel Serverless Function — 圖片生成後端 Route
// 金鑰存在 Vercel 環境變數 GEMINI_API_KEY（不帶 VITE_ 前綴），不會暴露給前端

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || '',          // 正式網域，在 Vercel 環境變數設定
  'http://localhost:5173',                  // Vite dev server（預設埠）
  'http://localhost:3000',                  // 本專案 vite dev 預設埠
  'http://localhost:4173',                  // Vite preview（預設埠）
  'http://localhost:4210',                  // 舊註解預留埠
  'http://127.0.0.1:4210',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
].filter(Boolean);

/** vercel dev 時允許筆電區網 IP + preview 埠，方便與上架前測試一致 */
function isPrivateLanOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    return /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h);
  } catch {
    return false;
  }
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (
    process.env.VERCEL_ENV === 'development' &&
    isPrivateLanOrigin(origin)
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 環境變數防呆（沒帶 VITE_ 前綴，不會打包進前端 bundle）
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[generate-image] 缺少 GEMINI_API_KEY 環境變數');
    return res.status(500).json({ error: '伺服器設定錯誤：缺少 API 金鑰' });
  }

  const { prompt } = req.body as { prompt?: string };
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt 不得為空' });
  }

  const ai = new GoogleGenAI({ apiKey });

  // ✅ API 參數健檢：強制使用 Pro 模型 + 高解析度、高畫質
  const PRO_MODEL = 'gemini-3-pro-image-preview';
  const FALLBACK_MODEL = 'gemini-3.1-flash-image-preview';

  // 高解析度與畫質設定（教育場景：16:9 適合教科書插圖，2K 提升清晰度）
  const HIGH_QUALITY_IMAGE_CONFIG = {
    responseModalities: ['TEXT', 'IMAGE'] as string[],
    imageConfig: {
      imageSize: '2K' as const,      // 1K | 2K | 4K，預設 1K 畫質較差
      aspectRatio: '16:9' as const, // 教育插圖常用比例
    },
  };

  let lastError: unknown;
  let modelUsed = '';

  for (const model of [PRO_MODEL, FALLBACK_MODEL]) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt.trim(),
        config: HIGH_QUALITY_IMAGE_CONFIG,
      });

      const parts = result.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          modelUsed = model;
          // ✅ 降級排查：若使用 fallback，明確記錄並回傳 modelUsed
          if (model === FALLBACK_MODEL) {
            console.warn('[generate-image] ⚠️ Pro 模型失敗，已降級至 Flash，畫質可能較低');
          }
          return res.status(200).json({
            imageUrl: `data:${mime};base64,${part.inlineData.data}`,
            modelUsed, // 供前端判斷是否降級
          });
        }
      }

      const textPart = parts.find((p) => p.text)?.text || '';
      console.warn(`[generate-image] ${model} 未回傳圖片。Text part:`, textPart);
      lastError = new Error('模型未回傳圖片，prompt 可能觸發安全過濾');
    } catch (e: any) {
      const status = e?.status ?? e?.code;
      console.error(`[generate-image] ${model} 失敗 (${status}):`, e?.message || e);
      lastError = e;
      // ✅ 降級排查：Pro 失敗時明確記錄，不靜默吞掉
      if (model === PRO_MODEL) {
        console.warn('[generate-image] Pro 模型呼叫失敗，將嘗試 fallback 至 Flash');
      }
      continue;
    }
  }

  const msg =
    lastError instanceof Error ? lastError.message : '圖片生成失敗，請稍後再試';
  return res.status(502).json({ error: msg });
}
