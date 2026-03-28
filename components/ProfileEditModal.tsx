
import React, { useState, useEffect } from 'react';
import { X, Save, User, UserPlus, Image as ImageIcon, Loader2, Upload, Eye, Trash2 } from 'lucide-react';
import { SavedProfile, DocField } from '../types';
import { validateField } from '../utils/validation';
import { uploadImage, saveProfile } from '../services/supabaseService';
import InputField from './InputField';
import ImagePreviewModal from './ImagePreviewModal';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SavedProfile | null; // null = create mode
  fieldDefinitions: DocField[];
  onSave: (updatedProfile: SavedProfile) => Promise<void>;
  onCreate?: (newProfile: SavedProfile) => void;
  onDelete?: (profileId: string) => Promise<void>;
}

const genAbbr = (name: string) => name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('');

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ 
  isOpen, onClose, profile, fieldDefinitions, onSave, onCreate, onDelete
}) => {
  const [data, setData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imgFrontUrl, setImgFrontUrl] = useState<string | null>(null);
  const [imgBackUrl, setImgBackUrl] = useState<string | null>(null);
  const [imgPortraitUrl, setImgPortraitUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const isCreate = !profile;
  const pendingFiles = React.useRef<{ front?: File; back?: File; portrait?: File }>({});

  useEffect(() => {
    if (isOpen) {
      if (profile) {
        setData({ ...profile.data });
        setImgFrontUrl(profile.id_card_front_url || null);
        setImgBackUrl(profile.id_card_back_url || null);
        setImgPortraitUrl(profile.id_card_portrait_url || null);
      } else {
        const emptyData: Record<string, string> = {};
        fieldDefinitions.filter(f => f.section === 'Party B').forEach(f => { emptyData[f.key] = f.value || ''; });
        setData(emptyData);
        setImgFrontUrl(null);
        setImgBackUrl(null);
        setImgPortraitUrl(null);
      }
      setErrors({});
      setShowDeleteConfirm(false);
      pendingFiles.current = {};
    }
  }, [isOpen, profile, fieldDefinitions]);

  if (!isOpen) return null;

  const handleFieldChange = (key: string, value: string) => {
    let finalValue = value;
    if (key === 'ho_ten') finalValue = value.toUpperCase();
    setData(prev => ({ ...prev, [key]: finalValue }));
    const error = validateField(key, finalValue);
    setErrors(prev => ({ ...prev, [key]: error || '' }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'portrait') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isCreate) {
      const localUrl = URL.createObjectURL(file);
      if (type === 'front') setImgFrontUrl(localUrl);
      else if (type === 'back') setImgBackUrl(localUrl);
      else setImgPortraitUrl(localUrl);
      if (type === 'front') pendingFiles.current.front = file;
      else if (type === 'back') pendingFiles.current.back = file;
      else pendingFiles.current.portrait = file;
      return;
    }

    if (!profile) return;
    setUploadingType(type);
    try {
      const url = await uploadImage(file, profile.id, type);
      if (type === 'front') setImgFrontUrl(url);
      else if (type === 'back') setImgBackUrl(url);
      else setImgPortraitUrl(url);
    } catch (err: any) {
      alert('Lỗi upload ảnh: ' + err.message);
    } finally {
      setUploadingType(null);
    }
  };

  const handleSave = async () => {
    const hoTen = data['ho_ten'] || '';
    const profileName = hoTen || 'Hồ sơ mới';
    const tenVietTat = genAbbr(hoTen);
    const finalData: Record<string, string> = { ...data, ten_viet_tat: tenVietTat };

    const newErrors: Record<string, string> = {};
    let hasError = false;
    Object.keys(finalData).forEach(key => {
      if (key === 'ten_viet_tat') return;
      const error = validateField(key, finalData[key]);
      if (error) { newErrors[key] = error; hasError = true; }
    });
    if (hasError) { setErrors(newErrors); alert("Vui lòng sửa các lỗi nhập liệu trước khi lưu."); return; }

    setIsSaving(true);
    try {
      if (isCreate) {
        const newProfile = await saveProfile({
          name: profileName,
          data: finalData,
          id_card_front_url: null,
          id_card_back_url: null,
          id_card_portrait_url: null,
        });

        let frontUrl = null, backUrl = null, portraitUrl = null;
        if (pendingFiles.current.front) frontUrl = await uploadImage(pendingFiles.current.front, newProfile.id, 'front');
        if (pendingFiles.current.back) backUrl = await uploadImage(pendingFiles.current.back, newProfile.id, 'back');
        if (pendingFiles.current.portrait) portraitUrl = await uploadImage(pendingFiles.current.portrait, newProfile.id, 'portrait');

        const finalProfile = {
          ...newProfile,
          name: profileName,
          data: finalData,
          id_card_front_url: frontUrl,
          id_card_back_url: backUrl,
          id_card_portrait_url: portraitUrl,
        };

        if (frontUrl || backUrl || portraitUrl) {
          const { updateProfile: updateProfileFn } = await import('../services/supabaseService');
          await updateProfileFn(finalProfile);
        }

        onCreate?.(finalProfile);
        pendingFiles.current = {};
        onClose();
      } else {
        await onSave({
          ...profile,
          name: profileName,
          data: finalData,
          id_card_front_url: imgFrontUrl || null,
          id_card_back_url: imgBackUrl || null,
          id_card_portrait_url: imgPortraitUrl || null,
        });
        onClose();
      }
    } catch (error: any) {
      alert('Lỗi: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(profile.id);
      onClose();
    } catch (error: any) {
      alert('Lỗi xóa: ' + (error.message || error));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const profileFields = fieldDefinitions.filter(f => f.section === 'Party B' && f.key !== 'ten_viet_tat');

  const renderImageSlot = (type: 'front' | 'back' | 'portrait', label: string, url: string | null) => {
    const inputId = `edit-${type}-${profile?.id || 'new'}-${Math.random()}`;
    const isUploading = uploadingType === type;

    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500 uppercase flex justify-between items-center">
          {label}
          <div className="flex items-center gap-2">
            {url && (
              <button type="button" onClick={() => setPreviewImage({ url, title: `${data['ho_ten'] || 'Hồ sơ'} - ${label}` })}
                className="text-blue-600 hover:text-blue-800 text-[10px] normal-case flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> Xem
              </button>
            )}
            <input type="file" className="hidden" id={inputId} accept="image/*" onChange={(e) => handleImageUpload(e, type)} disabled={isSaving || isUploading} />
            <label htmlFor={inputId} className={`text-blue-600 cursor-pointer hover:underline text-[10px] normal-case flex items-center gap-0.5 ${(isSaving || isUploading) ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload className="w-3 h-3" /> {url ? 'Thay đổi' : 'Tải lên'}
            </label>
          </div>
        </label>
        <div className="h-36 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden relative">
          {isUploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}
          {url ? (
            <img src={url} alt={label} className="h-full w-full object-contain" />
          ) : (
            <div className="text-slate-400 flex flex-col items-center">
              <ImageIcon className="w-8 h-8 mb-1" />
              <span className="text-xs">Chưa có ảnh</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <ImagePreviewModal isOpen={!!previewImage} imageUrl={previewImage?.url || null} title={previewImage?.title || ''} onClose={() => setPreviewImage(null)} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              {isCreate ? <UserPlus className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-blue-600" />}
              {isCreate ? 'Tạo hồ sơ mới' : 'Chỉnh sửa hồ sơ'}
            </h3>
            <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Thông tin cá nhân</h4>
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
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Ảnh CCCD & VNeID</h4>
                <div className="space-y-4">
                  {renderImageSlot('front', 'Mặt Trước', imgFrontUrl)}
                  {renderImageSlot('back', 'Mặt Sau', imgBackUrl)}
                  {renderImageSlot('portrait', 'Ảnh VNeID', imgPortraitUrl)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            {/* Delete button — only in edit mode */}
            <div>
              {!isCreate && onDelete && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <span className="text-xs text-red-600 font-medium">Xác nhận xóa?</span>
                    <button onClick={handleDelete} disabled={isDeleting}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:bg-red-400">
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Xóa
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5">
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(true)} disabled={isSaving}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" /> Xóa hồ sơ
                  </button>
                )
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors disabled:opacity-50">Hủy bỏ</button>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-sm transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Đang lưu...' : (isCreate ? 'Tạo hồ sơ' : 'Lưu thay đổi')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileEditModal;
