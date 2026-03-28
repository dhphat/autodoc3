import React from 'react';
import { X, Download } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, imageUrl, title, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-medium text-sm text-slate-700">{title}</h3>
            <div className="flex items-center gap-2">
              <a
                href={imageUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                title="Tải ảnh"
              >
                <Download className="w-4 h-4" />
              </a>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center bg-slate-100 p-4">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-[75vh] object-contain rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
