
import React from 'react';
import { Trash2, User, X } from 'lucide-react';
import { SavedProfile } from '../types';

interface ProfileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: SavedProfile[];
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const ProfileManagerModal: React.FC<ProfileManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  profiles, 
  onDelete,
  onSelect 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Quản lý hồ sơ
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">Chưa có hồ sơ nào được lưu.</p>
              <p className="text-xs mt-1">Hãy điền thông tin và nhấn "Lưu" ở màn hình chính.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                  <div className="flex-1 cursor-pointer" onClick={() => { onSelect(profile.id); onClose(); }}>
                    <h4 className="font-medium text-slate-800">{profile.name}</h4>
                    <p className="text-xs text-slate-500">
                      Ngày tạo: {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <button 
                    onClick={() => onDelete(profile.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Xóa hồ sơ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileManagerModal;
