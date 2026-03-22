import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSupportInteractions } from '../../hooks/useSupportInteractions';

export const BugReportForm: React.FC = () => {
  const { isSubmitting, submitSuccess, submitError, submitBugReport, resetForm } = useSupportInteractions();
  const [category, setCategory] = useState('bug');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [submitSuccessLocal, setSubmitSuccessLocal] = useState(false);
  const [submitErrorLocal, setSubmitErrorLocal] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 1. 發送 POST Request 到 Webhook 的 TypeScript 函式
  const sendToWebhook = async (data: { category: string; description: string; screenshot: File | null }) => {
    // 請替換為您團隊真實的 Discord 或 Slack Webhook URL
    const WEBHOOK_URL = (import.meta as any).env?.VITE_DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN';
    
    const formData = new FormData();
    
    // 根據 Discord Webhook 格式構建 Payload
    const payload = {
      content: `🚨 **收到新的使用者回報** 🚨\n**類型:** ${data.category}\n**描述:**\n${data.description}`,
      username: "Bug Report Bot",
    };
    
    formData.append('payload_json', JSON.stringify(payload));
    
    if (data.screenshot) {
      formData.append('file', data.screenshot);
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Webhook 請求失敗: ${response.status} ${response.statusText}`);
    }
  };

  // 3. 將 API 呼叫整合進既有的 React 表單提交事件 (onSubmit) 中
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmittingLocal(true);
    setSubmitErrorLocal(null);
    setSubmitSuccessLocal(false);

    try {
      // 2. 加入基本的 try-catch 錯誤處理
      await sendToWebhook({ category, description, screenshot });
      setSubmitSuccessLocal(true);
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      setSubmitErrorLocal('送出失敗，請檢查網路連線或稍後再試。若持續發生，請直接聯繫客服。');
    } finally {
      setIsSubmittingLocal(false);
    }
  };

  if (submitSuccessLocal) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-emerald-800 mb-2">回報成功！</h3>
        <p className="text-emerald-600 mb-6">感謝您的反饋，我們的團隊將會盡快處理。</p>
        <button 
          onClick={() => {
            setSubmitSuccessLocal(false);
            setSubmitErrorLocal(null);
            setDescription('');
            removeScreenshot();
          }}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          再次回報
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-indigo-500" />
        回報問題
      </h3>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">問題類型</label>
        <select 
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
        >
          <option value="bug">功能異常 (Bug)</option>
          <option value="billing">帳務問題</option>
          <option value="feature">功能建議</option>
          <option value="other">其他</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">詳細描述</label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="請詳細描述您遇到的情況，包含操作步驟..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
          required
        />
      </div>

      {/* Screenshot Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">上傳截圖 (選填)</label>
        
        {!previewUrl ? (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-600 font-medium">點擊或拖曳圖片至此</p>
            <p className="text-xs text-slate-400 mt-1">支援 JPG, PNG (最大 5MB)</p>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
            <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                onClick={removeScreenshot}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={isSubmittingLocal || !description.trim()}
        className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
          isSubmittingLocal || !description.trim()
            ? 'bg-slate-300 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]'
        }`}
      >
        {isSubmittingLocal ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> 提交中...
          </>
        ) : (
          '送出回報'
        )}
      </button>

      {submitErrorLocal && (
        <p className="text-red-500 text-sm text-center mt-2">{submitErrorLocal}</p>
      )}
    </form>
  );
};
