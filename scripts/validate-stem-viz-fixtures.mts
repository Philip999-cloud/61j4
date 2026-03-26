/**
 * 以 fixtures/ceec-sample-payloads.json 內 `viz_*` 鍵驗證 STEM 視覺化 payload。
 * 可擴充：第二階段可接受 JSONL 路徑參數做內部回歸（勿將版權試題全文放入 repo）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  filterRenderableVisualizations,
  validateVisualizationItem,
} from '../utils/validateStemVisualization.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '../fixtures/ceec-sample-payloads.json');
const data = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;

let failed = false;
for (const [key, value] of Object.entries(data)) {
  if (!key.startsWith('viz_')) continue;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    console.error(`Fixture ${key}: expected object`);
    failed = true;
    continue;
  }
  const item = value as Record<string, unknown>;
  const r = validateVisualizationItem(item);
  if (!r.valid) {
    console.error(`Fixture ${key}: validateVisualizationItem expected valid, got`, r);
    failed = true;
  }
  const filtered = filterRenderableVisualizations([item]);
  if (filtered.length !== 1) {
    console.error(`Fixture ${key}: filterRenderableVisualizations expected 1, got ${filtered.length}`);
    failed = true;
  }
}

if (failed) process.exit(1);
