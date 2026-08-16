import React, { useState, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { getSecureImageUrl } from '../services/supabaseService';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, imageUrl, title, onClose }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && imageUrl) {
      setIsLoading(true);
      getSecureImageUrl(imageUrl).then(url => {
        setResolvedUrl(url || imageUrl);
      }).catch(() => {
        setResolvedUrl(imageUrl);
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setResolvedUrl(null);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-medium text-sm text-slate-700">{title}</h3>
            <div className="flex items-center gap-2">
              {resolvedUrl && (
                <a
                  href={resolvedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                  title="Tải ảnh"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center bg-slate-100 p-4 min-h-[300px]">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-xs">Đang tải ảnh an toàn...</span>
              </div>
            ) : resolvedUrl ? (
              <img
                src={resolvedUrl}
                alt={title}
                className="max-w-full max-h-[75vh] object-contain rounded"
              />
            ) : (
              <p className="text-sm text-slate-400">Không tìm thấy ảnh</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
