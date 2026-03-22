import React, { useRef, useState } from 'react';
import { Editor } from 'ketcher-react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import 'ketcher-react/dist/index.css';

const structServiceProvider = new StandaloneStructServiceProvider();

interface ChemicalEditorProps {
  onSave: (smiles: string) => void;
  onClose: () => void;
}

const COMMON_SMILES = [
  { name: '水 (Water)', smiles: 'O' },
  { name: '二氧化碳 (Carbon Dioxide)', smiles: 'O=C=O' },
  { name: '阿斯匹靈 (Aspirin)', smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
  { name: '咖啡因 (Caffeine)', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { name: '葡萄糖 (Glucose)', smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O' },
  { name: '雙酚 A (Bisphenol A)', smiles: 'CC(C)(c1ccc(O)cc1)c2ccc(O)cc2' },
  { name: '乙醇 (Ethanol)', smiles: 'CCO' },
  { name: '乙酸 (Acetic Acid)', smiles: 'CC(=O)O' },
];

export const ChemicalEditor: React.FC<ChemicalEditorProps> = ({ onSave, onClose }) => {
  const ketcherRef = useRef<any>(null);
  const [smilesInput, setSmilesInput] = useState('');
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSave = async () => {
    if (ketcherRef.current) {
      try {
        const smiles = await ketcherRef.current.getSmiles();
        onSave(smiles);
        onClose();
      } catch (error) {
        console.error("Failed to get SMILES:", error);
      }
    }
  };

  const handleSmilesChange = async (value: string) => {
    setSmilesInput(value);
    setError('');
    
    if (!value.trim()) {
      if (ketcherRef.current) {
        try {
          await ketcherRef.current.setMolecule('');
        } catch (e) {}
      }
      return;
    }

    if (ketcherRef.current) {
      try {
        await ketcherRef.current.setMolecule(value);
      } catch (err) {
        setError('SMILES 格式錯誤，無法解析。');
      }
    }
  };

  const filteredSuggestions = COMMON_SMILES.filter(
    item => item.name.toLowerCase().includes(smilesInput.toLowerCase()) || 
            item.smiles.toLowerCase().includes(smilesInput.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-[90vw] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">🧪 化學繪圖板 (Ketcher)</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              取消
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              確認 / 儲存
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="relative">
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">SMILES 快速輸入 / 自動補全</label>
            <input
              type="text"
              value={smilesInput}
              onChange={(e) => handleSmilesChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="輸入 SMILES 字串或常見化合物名稱..."
              className={`w-full px-4 py-2 bg-white dark:bg-zinc-900 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                error ? 'border-red-500 focus:ring-red-500/20' : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            />
            {error && (
              <p className="absolute -bottom-5 left-0 text-xs font-bold text-red-500">{error}</p>
            )}
            
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {filteredSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 flex flex-col gap-0.5 border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"
                    onClick={() => {
                      handleSmilesChange(item.smiles);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.name}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{item.smiles}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative bg-white" data-asea-will-read-frequently>
          <Editor
            staticResourcesUrl={""}
            structServiceProvider={structServiceProvider}
            onInit={(ketcher) => {
              ketcherRef.current = ketcher;
            }}
            errorHandler={(message) => {
              console.error(message);
            }}
          />
        </div>
      </div>
    </div>
  );
};
