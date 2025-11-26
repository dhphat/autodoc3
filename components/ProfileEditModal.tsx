
import React, { useState, useEffect } from 'react';
import { X, Save, User, Image as ImageIcon, Loader2 } from 'lucide-react';
import { SavedProfile, DocField } from '../types';
import { validateField } from '../utils/validation';
import InputField from './InputField';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SavedProfile | null;
  fieldDefinitions: DocField[]; // Pass the main fields config which contains API data (banks)
  onSave: (updatedProfile: SavedProfile) => Promise<void>; // Make onSave async
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ 
  isOpen, 
  onClose, 
  profile, 
  fieldDefinitions,
  onSave 
}) => {
  const [name, setName] = useState('');
  const [data, setData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imgFront, setImgFront] = useState<string | null>(null);
  const [imgBack, setImgBack] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setData({ ...profile.data });
      setImgFront(profile.idCardFront || null);
      setImgBack(profile.idCardBack || null);
      setErrors({});
    }
  }, [profile]);

  if (!isOpen || !profile) return null;

  const handleFieldChange = (key: string, value: string) => {
    let finalValue = value;
    // Auto Uppercase Name
    if (key === 'ho_ten') {
        finalValue = value.toUpperCase();
    }
    
    setData(prev => ({ ...prev, [key]: finalValue }));
    
    const error = validateField(key, finalValue);
    setErrors(prev => ({ ...prev, [key]: error || '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
             const img = new Image();
             img.src = reader.result as string;
             img.onload = () => {
                 const canvas = document.createElement('canvas');
                 // OPTIMIZED: Reduce max width to 600px
                 const MAX_WIDTH = 600;
                 let width = img.width;
                 let height = img.height;
                 
                 if (width > MAX_WIDTH) {
                     height = (height * MAX_WIDTH) / width;
                     width = MAX_WIDTH;
                 }

                 canvas.width = width;
                 canvas.height = height;
                 const ctx = canvas.getContext('2d');
                 ctx?.drawImage(img, 0, 0, width, height);
                 
                 // OPTIMIZED: Compress to JPEG 0.6 quality
                 const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                 if (type === 'front') setImgFront(dataUrl);
                 else setImgBack(dataUrl);
             };
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Tên hồ sơ không được để trống");
      return;
    }

    // Validate all fields before saving
    const newErrors: Record<string, string> = {};
    let hasError = false;
    
    Object.keys(data).forEach(key => {
        const error = validateField(key, data[key]);
        if (error) {
            newErrors[key] = error;
            hasError = true;
        }
    });

    if (hasError) {
        setErrors(newErrors);
        alert("Vui lòng sửa các lỗi nhập liệu trước khi lưu.");
        return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...profile,
        name,
        data,
        idCardFront: imgFront || null,
        idCardBack: imgBack || null
      });
      onClose(); // Only close on success
    } catch (error) {
      console.error(error);
      // Error handling is usually done in onSave, but we keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  // Filter fields that are relevant for profiles (Party B generally)
  // We use the passed fieldDefinitions to ensure we have the latest options (e.g. Banks)
  const profileFields = fieldDefinitions.filter(f => f.section === 'Party B');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Chỉnh sửa hồ sơ
          </h3>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Profile Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Tên hồ sơ</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="w-full border border-slate-300 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Thông tin chi tiết</h4>
                <div className="space-y-4">
                    {profileFields.map(field => (
                        <InputField
                            key={field.key}
                            label={field.label}
                            fieldKey={field.key}
                            value={data[field.key] || ''}
                            onChange={(key, val) => handleFieldChange(key, val)}
                            placeholder={field.placeholder}
                            type={field.type}
                            options={field.options}
                            error={errors[field.key]}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Ảnh CCCD (Lưu trữ)</h4>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 uppercase flex justify-between">
                            Mặt Trước
                            <input type="file" className="hidden" id="edit-front" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} disabled={isSaving} />
                            <label htmlFor="edit-front" className={`text-blue-600 cursor-pointer hover:underline text-[10px] normal-case ${isSaving ? 'pointer-events-none opacity-50' : ''}`}>Thay đổi</label>
                        </label>
                        <div className="h-40 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {imgFront ? (
                                <img src={imgFront} alt="CCCD Truoc" className="h-full w-full object-contain" />
                            ) : (
                                <div className="text-slate-400 flex flex-col items-center">
                                    <ImageIcon className="w-8 h-8 mb-1" />
                                    <span className="text-xs">Chưa có ảnh</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 uppercase flex justify-between">
                            Mặt Sau
                            <input type="file" className="hidden" id="edit-back" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} disabled={isSaving} />
                            <label htmlFor="edit-back" className={`text-blue-600 cursor-pointer hover:underline text-[10px] normal-case ${isSaving ? 'pointer-events-none opacity-50' : ''}`}>Thay đổi</label>
                        </label>
                        <div className="h-40 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {imgBack ? (
                                <img src={imgBack} alt="CCCD Sau" className="h-full w-full object-contain" />
                            ) : (
                                <div className="text-slate-400 flex flex-col items-center">
                                    <ImageIcon className="w-8 h-8 mb-1" />
                                    <span className="text-xs">Chưa có ảnh</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          </div>

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors disabled:opacity-50">
                Hủy bỏ
            </button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-sm transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;
