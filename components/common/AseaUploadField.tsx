import React, { useRef } from 'react';

const convertFileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

interface AseaUploadFieldProps {
  id?: string;
  icon?: React.ReactNode | string;
  title?: string;
  subtitle?: string;
  images: string[];
  onUpload: (imgs: string[]) => void;
  onRemove: (index: number) => void;
}

export const AseaUploadField: React.FC<AseaUploadFieldProps> = ({ 
  id, icon, title, subtitle, images, onUpload, onRemove 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const dataUrls = await Promise.all(files.map(convertFileToDataUrl));
      onUpload([...images, ...dataUrls]);
      e.target.value = ''; 
    }
  };

  return (
    <div id={id} className="space-y-4">
      {(title || subtitle) && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-xl">{icon}</span>}
            {title && <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>}
          </div>
          {subtitle && <p className="text-xs text-[var(--text-secondary)] font-medium pl-1">{subtitle}</p>}
        </div>
      )}

      {/* 將原本的 bg-zinc-900 替換為 bg-[var(--bg-main)] */}
      <div className="border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-main)] rounded-2xl min-h-[200px] flex flex-col items-center justify-center p-6 relative group transition-colors hover:border-blue-400">
        <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />

        {images.length > 0 ? (
          <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
             {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] group/img bg-black">
                   <img src={img} className="w-full h-full object-cover" alt="uploaded" onError={(e) => { e.currentTarget.src = 'https://placehold.co/200?text=Error'; }} />
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => onRemove(idx)} className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                   </div>
                </div>
             ))}
             <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-card)]">
                <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="text-xs font-bold">加圖</span>
             </button>
          </div>
        ) : (
          <div className="text-center space-y-6">
             <div className="w-16 h-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full flex items-center justify-center mx-auto text-[var(--text-secondary)] transition-colors shadow-sm">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
             </div>
             <div className="space-y-1">
                <p className="text-[var(--text-primary)] text-sm font-bold">拖放圖片至此，或點擊下方按鈕上傳</p>
                <p className="text-[var(--text-secondary)] text-xs">支援 JPG, PNG 格式</p>
             </div>
             <div className="flex items-center justify-center gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                   選擇檔案
                </button>
                <button onClick={() => cameraInputRef.current?.click()} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   拍照
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};