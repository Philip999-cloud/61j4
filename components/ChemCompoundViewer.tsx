import React, { useEffect, useMemo, useState } from 'react';
import {
  Viewer3D,
  safeDecodeCompoundLabel,
  containsChineseForPubchemBlock,
  isPubchemAsciiNameSafe,
  compoundLookupStringContainsChinese,
} from './Viewer3D';
import { fetchGeneratedImage } from '../geminiService';
import { enqueuePubChemRestRequest } from '../utils/pubChemThrottle';
import type { Compound } from '../types';

interface CompoundData {
  cid: number;
  name: string;
  formula?: string;
  iupacName?: string;
  pubchemUrl: string;
}

type FetchStatus = 'idle' | 'loading' | 'done' | 'error' | 'skipped_chinese';

// ── PubChem 查詢（解碼後檢中文／英數安全，再打 name API）──────────────────────
async function fetchCID(name: string): Promise<number> {
  const decoded = safeDecodeCompoundLabel(name).trim();
  if (!decoded) throw new Error('PUBCHEM_NAME_CHINESE_BLOCKED');
  if (containsChineseForPubchemBlock(decoded)) {
    throw new Error('PUBCHEM_NAME_CHINESE_BLOCKED');
  }
  if (!isPubchemAsciiNameSafe(decoded)) {
    throw new Error('PUBCHEM_NAME_CHINESE_BLOCKED');
  }
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(decoded)}/cids/JSON`;
  return enqueuePubChemRestRequest(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PubChem name lookup failed: ${res.status}`);
    const data = await res.json();
    const cid = data?.IdentifierList?.CID?.[0];
    if (!cid) throw new Error(`找不到化合物：${decoded}`);
    return cid;
  });
}

async function fetchCIDFromSmiles(smiles: string): Promise<number> {
  const q = smiles.trim();
  if (compoundLookupStringContainsChinese(q)) {
    throw new Error('PUBCHEM_SMILES_INVALID');
  }
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(q)}/cids/JSON`;
  return enqueuePubChemRestRequest(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PubChem SMILES lookup failed: ${res.status}`);
    const data = await res.json();
    const cid = data?.IdentifierList?.CID?.[0];
    if (!cid) throw new Error(`找不到與 SMILES 對應的化合物`);
    return cid;
  });
}

async function resolveCompoundCid(compound: Compound): Promise<number> {
  const sm = compound.smiles?.trim();
  if (sm) return fetchCIDFromSmiles(sm);
  const en = compound.english_name?.trim();
  if (en) {
    const dec = safeDecodeCompoundLabel(en).trim();
    if (containsChineseForPubchemBlock(dec) || !isPubchemAsciiNameSafe(dec)) {
      throw new Error('PUBCHEM_NAME_CHINESE_BLOCKED');
    }
    return fetchCID(en);
  }
  if (containsChineseForPubchemBlock(compound.name)) {
    const err = new Error('PUBCHEM_CHINESE_ONLY');
    (err as Error & { compoundLabel?: string }).compoundLabel = safeDecodeCompoundLabel(compound.name);
    throw err;
  }
  return fetchCID(compound.name);
}

async function fetchCompoundProps(cid: number): Promise<{ iupacName?: string; formula?: string }> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName,MolecularFormula/JSON`;
    return await enqueuePubChemRestRequest(async () => {
      const res = await fetch(url);
      if (!res.ok) return {};
      const data = await res.json();
      const props = data?.PropertyTable?.Properties?.[0] || {};
      return { iupacName: props.IUPACName, formula: props.MolecularFormula };
    });
  } catch {
    return {};
  }
}

// ── 單一化合物卡片 ───────────────────────────────────────────────────────────
const CompoundCard: React.FC<{ compound: Compound }> = ({ compound }) => {
  const displayName = useMemo(() => safeDecodeCompoundLabel(compound.name), [compound.name]);
  const [compoundData, setCompoundData] = useState<CompoundData | null>(null);
  const [cidStatus, setCidStatus] = useState<FetchStatus>('loading');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<FetchStatus>('idle');
  const [cidError, setCidError] = useState<string | null>(null);

  // Step 1：查 PubChem CID
  useEffect(() => {
    let cancelled = false;
    setCidStatus('loading');

    const lookup = async () => {
      try {
        const cid = await resolveCompoundCid(compound);
        const props = await fetchCompoundProps(cid);
        if (!cancelled) {
          setCompoundData({
            cid,
            name: displayName,
            formula: compound.formula || props.formula,
            iupacName: props.iupacName,
            pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
          });
          setCidStatus('done');
        }
      } catch (e: any) {
        if (!cancelled) {
          if (e?.message === 'PUBCHEM_SMILES_INVALID') {
            console.warn('[ChemCompoundViewer] SMILES 含 CJK 或無法查詢', { name: displayName });
            setCidError('SMILES 含不支援字元或無法向 PubChem 解析');
            setCidStatus('error');
          } else if (
            e?.message === 'PUBCHEM_CHINESE_ONLY' ||
            e?.message === 'PUBCHEM_NAME_CHINESE_BLOCKED'
          ) {
            console.warn(
              '[ChemCompoundViewer] 已略過 PubChem name API：中文或無效名稱，未送請求。',
              { name: e?.compoundLabel ?? displayName }
            );
            setCidError(null);
            setCidStatus('skipped_chinese');
          } else {
            setCidError(e?.message || '查詢失敗');
            setCidStatus('error');
          }
        }
      }
    };

    lookup();
    return () => { cancelled = true; };
  }, [compound.name, compound.smiles, compound.english_name, displayName]);

  // Step 2：CID 拿到後，呼叫 NanaBanana Pro 生成平面結構式
  useEffect(() => {
    if (cidStatus !== 'done' || !compoundData) return;
    let cancelled = false;
    setImageStatus('loading');

    const generate = async () => {
      try {
        const prompt = [
          `2D structural formula of ${compoundData.name}`,
          compoundData.formula ? `(${compoundData.formula})` : '',
          'clean white background, IUPAC style, clear bond angles,',
          'textbook chemistry illustration, no watermark, high detail',
        ].filter(Boolean).join(' ');

        const url = await fetchGeneratedImage(prompt);
        if (!cancelled) {
          setImageUrl(url);
          setImageStatus('done');
        }
      } catch (e: any) {
        if (!cancelled) setImageStatus('error');
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [cidStatus, compoundData]);

  // ── Loading（查 PubChem 中）──
  if (cidStatus === 'loading') {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-center gap-3 text-zinc-400">
        <svg className="w-5 h-5 animate-spin text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-sm">查詢 <span className="font-semibold text-zinc-600 dark:text-zinc-300">{displayName}</span> 結構資料中...</span>
      </div>
    );
  }

  // ── 略過 PubChem（僅中文名、無 SMILES／英文名）──
  if (cidStatus === 'skipped_chinese') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-200 flex flex-col gap-2">
        <div className="flex items-center gap-2 font-medium">
          <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          無法載入 3D／結構查詢
        </div>
        <p className="text-xs leading-relaxed opacity-90 pl-6">
          「<span className="font-semibold">{displayName}</span>」僅有中文顯示名，PubChem 無法以中文直接查詢。請在 AI 輸出中為此化合物補上標準 <strong className="font-mono">smiles</strong> 或精確 <strong>english_name</strong>（英文學名／IUPAC）。
        </p>
      </div>
    );
  }

  // ── Error（找不到化合物）──
  if (cidStatus === 'error') {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {cidError || `無法查詢 ${displayName} 的結構資料`}
      </div>
    );
  }

  if (!compoundData) return null;

  return (
    <div className="bg-white dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden">
      {/* 化合物標題列 */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{compoundData.name}</h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {compoundData.formula && (
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                {compoundData.formula}
              </span>
            )}
            <span className="text-[10px] text-zinc-400">CID: {compoundData.cid}</span>
          </div>
        </div>
        <a
          href={compoundData.pubchemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          PubChem
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="p-4 space-y-4">
        {/* ── 上：NanaBanana Pro 平面結構式 ── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">平面結構式</span>
            <span className="text-[9px] text-zinc-300 dark:text-zinc-600 ml-1">Nano Banana Pro</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden" style={{ minHeight: '180px' }}>
            {imageStatus === 'loading' && (
              <div className="flex flex-col items-center justify-center h-44 gap-2 text-zinc-400">
                <svg className="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-xs">AI 生成結構式中...</span>
              </div>
            )}
            {imageStatus === 'done' && imageUrl && (
              <img
                src={imageUrl}
                alt={`${compoundData.name} 平面結構式`}
                className="w-full object-contain max-h-56 p-3"
              />
            )}
            {imageStatus === 'error' && (
              <div className="flex flex-col items-center justify-center h-44 gap-2 text-zinc-400">
                <span className="text-xs text-zinc-400">AI 結構式生成失敗</span>
                {/* Fallback：改用 PubChem 官方 2D 圖 */}
                <img
                  src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compoundData.cid}/PNG`}
                  alt={`${compoundData.name} 2D structure`}
                  className="max-h-40 object-contain mt-2"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-[10px] text-zinc-300 mt-1">（PubChem 2D 結構圖）</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 下：3D 互動模型 ── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">3D 立體模型</span>
            <span className="text-[9px] text-zinc-300 dark:text-zinc-600 ml-1">PubChem · 可旋轉</span>
          </div>
          <Viewer3D cid={compoundData.cid} />
        </div>
      </div>
    </div>
  );
};

// ── 主元件：渲染所有化合物 ────────────────────────────────────────────────────
export const ChemCompoundViewer: React.FC<{ compounds: Compound[] }> = ({ compounds }) => {
  if (!compounds || compounds.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          題目涉及化合物
        </span>
        <span className="text-[10px] text-zinc-400">({compounds.length} 種)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {compounds.map((c, i) => (
          <CompoundCard key={`${c.name}-${c.smiles ?? ''}-${c.english_name ?? ''}-${i}`} compound={c} />
        ))}
      </div>
    </div>
  );
};

export default ChemCompoundViewer;
