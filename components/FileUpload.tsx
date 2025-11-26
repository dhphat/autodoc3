import React, { useRef } from 'react';
import { Upload, FileText, CheckCircle, Trash2, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  label: string;
  file: File | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  accept?: string;
  placeholder?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  file, 
  onUpload, 
  onRemove, 
  accept = ".docx",
  placeholder 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const isImage = accept.includes('image');
  const defaultPlaceholder = isImage 
    ? "Click để tải ảnh (JPG, PNG...)" 
    : "Click để tải lên file mẫu (.docx)";

  const displayPlaceholder = placeholder || defaultPlaceholder;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      
      {!file ? (
        <div 
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group"
        >
          {isImage ? (
            <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
          )}
          <p className="text-sm text-gray-500 text-center">
            {displayPlaceholder}
          </p>
          <input 
            type="file" 
            ref={inputRef} 
            className="hidden" 
            accept={accept} 
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
              {isImage ? (
                 <ImageIcon className="w-5 h-5 text-green-600" />
              ) : (
                 <FileText className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Đã tải lên
              </p>
            </div>
          </div>
          <button 
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
            title="Xóa file"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;