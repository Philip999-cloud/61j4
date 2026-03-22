import React, { useRef } from 'react';
import { Camera, Loader2, Upload } from 'lucide-react';

interface AvatarManagerProps {
  avatarUrl: string;
  isUploading: boolean;
  onUpload: (file: File) => void;
}

export const AvatarManager: React.FC<AvatarManagerProps> = ({
  avatarUrl,
  isUploading,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        className="relative group cursor-pointer"
        onClick={triggerFileInput}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && triggerFileInput()}
        aria-label="更換大頭貼"
      >
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg relative">
          {isUploading ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : (
            <img
              src={avatarUrl}
              alt="User Avatar"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          )}
          
          {/* Hover Overlay */}
          <div 
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white z-10 pointer-events-none"
          >
            <Camera className="w-8 h-8 mb-1" />
            <span className="text-xs font-medium">更換頭像</span>
          </div>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
      
      <div className="text-center">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mx-auto"
        >
          <Upload className="w-4 h-4" />
          上傳新照片
        </button>
        <p className="text-xs text-slate-400 mt-1">支援 JPG, PNG (最大 2MB)</p>
      </div>
    </div>
  );
};
