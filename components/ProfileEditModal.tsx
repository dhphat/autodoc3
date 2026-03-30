
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, User, UserPlus, Image as ImageIcon, Loader2, Upload, Eye, Trash2, ChevronDown } from 'lucide-react';
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
  const [banks, setBanks] = useState<{ shortName: string; name: string }[]>([]);
  const [bankQuery, setBankQuery] = useState('');
  const [isBankOpen, setIsBankOpen] = useState(false);
  const bankRef = useRef<HTMLDivElement>(null);
  const [imgFrontUrl, setImgFrontUrl] = useState<string | null>(null);
  const [imgBackUrl, setImgBackUrl] = useState<string | null>(null);
  const [imgPortraitUrl, setImgPortraitUrl] = useState<string | null>(null);
  const [imgVneid2_1Url, setImgVneid2_1Url] = useState<string | null>(null);
  const [imgVneid2_2Url, setImgVneid2_2Url] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const isCreate = !profile;
  const pendingFiles = React.useRef<{ front?: File; back?: File; portrait?: File; vneid2_1?: File; vneid2_2?: File }>({});

  useEffect(() => {
    if (isOpen) {
      if (profile) {
        setData({ ...profile.data });
        setImgFrontUrl(profile.id_card_front_url || null);
        setImgBackUrl(profile.id_card_back_url || null);
        setImgPortraitUrl(profile.id_card_portrait_url || null);
        setImgVneid2_1Url(profile.vneid_2_photo_1_url || null);
        setImgVneid2_2Url(profile.vneid_2_photo_2_url || null);
      } else {
        const emptyData: Record<string, string> = {};
        fieldDefinitions.filter(f => f.section === 'Party B').forEach(f => { emptyData[f.key] = f.value || ''; });
        setData(emptyData);
        setImgFrontUrl(null);
        setImgBackUrl(null);
        setImgPortraitUrl(null);
        setImgVneid2_1Url(null);
        setImgVneid2_2Url(null);
      }
      setErrors({});
      setShowDeleteConfirm(false);
      pendingFiles.current = {};
    }
  }, [isOpen, profile, fieldDefinitions]);

  // Load banks
  useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(d => { if (d?.data) setBanks(d.data.map((b: any) => ({ shortName: b.shortName, name: b.name }))); })
      .catch(console.error);
  }, []);

  // Sync bank search query with selection
  useEffect(() => {
    const selectedBank = data['ngan_hang'];
    if (selectedBank) {
      const match = banks.find(b => `${b.name} (${b.shortName})` === selectedBank);
      if (match) setBankQuery(`${match.shortName} - ${match.name}`);
    } else {
      setBankQuery('');
    }
  }, [data['ngan_hang'], banks]);

  // Click outside to close bank dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(event.target as Node)) {
        setIsBankOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleFieldChange = (key: string, value: string) => {
    let finalValue = value;
    if (key === 'ho_ten') finalValue = value.toUpperCase();
    setData(prev => ({ ...prev, [key]: finalValue }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const onFieldBlur = (key: string) => {
    // We use a small delay for bank to allow the clicked selection to update state first
    const delay = key === 'ngan_hang' ? 300 : 0;
    setTimeout(() => {
      setData(latestData => {
        const val = (latestData[key] || '').trim();
        if (!val) {
          setErrors(prev => ({ ...prev, [key]: 'Bắt buộc' }));
        } else {
          const msg = validateField(key, val);
          setErrors(prev => ({ ...prev, [key]: msg || '' }));
        }
        return latestData;
      });
    }, delay);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'portrait' | 'vneid2_1' | 'vneid2_2') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isCreate) {
      const localUrl = URL.createObjectURL(file);
      if (type === 'front') setImgFrontUrl(localUrl);
      else if (type === 'back') setImgBackUrl(localUrl);
      else if (type === 'portrait') setImgPortraitUrl(localUrl);
      else if (type === 'vneid2_1') setImgVneid2_1Url(localUrl);
      else if (type === 'vneid2_2') setImgVneid2_2Url(localUrl);
      pendingFiles.current[type] = file;
      return;
    }

    if (!profile) return;
    setUploadingType(type);
    try {
      const url = await uploadImage(file, profile.id, type);
      if (type === 'front') setImgFrontUrl(url);
      else if (type === 'back') setImgBackUrl(url);
      else if (type === 'portrait') setImgPortraitUrl(url);
      else if (type === 'vneid2_1') setImgVneid2_1Url(url);
      else if (type === 'vneid2_2') setImgVneid2_2Url(url);
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
    
    profileFields.forEach(f => {
      const val = data[f.key]?.trim() || '';
      if (!val) {
        newErrors[f.key] = 'Bắt buộc';
        hasError = true;
      } else {
        const error = validateField(f.key, val);
        if (error) {
          newErrors[f.key] = error;
          hasError = true;
        }
      }
    });

    if (hasError) { 
      setErrors(newErrors); 
      alert("Vui lòng điền đầy đủ và đúng định dạng các thông tin bắt buộc."); 
      return; 
    }

    setIsSaving(true);
    try {
      if (isCreate) {
        const newProfile = await saveProfile({
          name: profileName,
          data: finalData,
          id_card_front_url: null,
          id_card_back_url: null,
          id_card_portrait_url: null,
          vneid_2_photo_1_url: null,
          vneid_2_photo_2_url: null,
        });

        let frontUrl = null, backUrl = null, portraitUrl = null;
        let vneid2_1Url = null, vneid2_2Url = null;
        if (pendingFiles.current.front) frontUrl = await uploadImage(pendingFiles.current.front, newProfile.id, 'front');
        if (pendingFiles.current.back) backUrl = await uploadImage(pendingFiles.current.back, newProfile.id, 'back');
        if (pendingFiles.current.portrait) portraitUrl = await uploadImage(pendingFiles.current.portrait, newProfile.id, 'portrait');
        if (pendingFiles.current.vneid2_1) vneid2_1Url = await uploadImage(pendingFiles.current.vneid2_1, newProfile.id, 'vneid2_1');
        if (pendingFiles.current.vneid2_2) vneid2_2Url = await uploadImage(pendingFiles.current.vneid2_2, newProfile.id, 'vneid2_2');

        const finalProfile = {
          ...newProfile,
          name: profileName,
          data: finalData,
          id_card_front_url: frontUrl,
          id_card_back_url: backUrl,
          id_card_portrait_url: portraitUrl,
          vneid_2_photo_1_url: vneid2_1Url,
          vneid_2_photo_2_url: vneid2_2Url,
        };

        if (frontUrl || backUrl || portraitUrl || vneid2_1Url || vneid2_2Url) {
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
          vneid_2_photo_1_url: imgVneid2_1Url || null,
          vneid_2_photo_2_url: imgVneid2_2Url || null,
        });
        onClose();
      }
    } catch (error: any) {
      console.error('Save profile error:', error);
      alert('Không thể lưu hồ sơ. Lỗi: ' + (error.message || error));
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

  const renderImageSlot = (type: 'front' | 'back' | 'portrait' | 'vneid2_1' | 'vneid2_2', label: string, url: string | null) => {
    const inputId = `edit-${type}-${profile?.id || 'new'}-${Math.random()}`;
    const isUploading = uploadingType === type;

    return (
      <div className="flex flex-col h-full">
        <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between items-center mb-1.5 px-0.5">
          {label} <span className="text-red-400">*</span>
          <div className="flex items-center gap-2">
            {url && (
              <button type="button" onClick={() => setPreviewImage({ url, title: `${data['ho_ten'] || 'Hồ sơ'} - ${label}` })}
                className="text-blue-600 hover:text-blue-800 text-[9px] normal-case flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" /> Xem
              </button>
            )}
            <input type="file" className="hidden" id={inputId} accept="image/*" onChange={(e) => handleImageUpload(e, type)} disabled={isSaving || isUploading} />
            <label htmlFor={inputId} className={`text-blue-600 cursor-pointer hover:underline text-[9px] normal-case flex items-center gap-0.5 ${(isSaving || isUploading) ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload className="w-2.5 h-2.5" /> {url ? 'Thay đổi' : 'Tải lên'}
            </label>
          </div>
        </label>
        <div className={`aspect-[4/3] bg-slate-100 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden relative transition-all ${url ? 'border-blue-100 bg-white' : 'border-slate-200'}`}>
          {isUploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          )}
          {url ? (
            <img src={url} alt={label} className="h-full w-full object-contain" />
          ) : (
            <div className="text-slate-400 flex flex-col items-center">
              <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
              <span className="text-[10px]">Chưa có ảnh</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderField = (field: DocField) => {
    // Special handling for Bank selection to allow search
    if (field.key === 'ngan_hang') {
      const filteredBanks = banks.filter(b => 
        b.shortName.toLowerCase().includes(bankQuery.toLowerCase()) || 
        b.name.toLowerCase().includes(bankQuery.toLowerCase())
      );
      const errorMsg = errors[field.key];

      return (
        <div key={field.key} className="flex flex-col gap-1.5" ref={bankRef}>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {field.label} <span className="text-red-400">*</span> <span className="text-slate-400 font-normal normal-case opacity-70">{"{"}{field.key}{"}"}</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={bankQuery}
              onChange={(e) => {
                setBankQuery(e.target.value);
                setIsBankOpen(true);
                if (data[field.key]) handleFieldChange(field.key, '');
              }}
              onFocus={() => setIsBankOpen(true)}
              onBlur={() => onFieldBlur(field.key)}
              placeholder={field.placeholder || "Tìm kiếm ngân hàng..."}
              className={`w-full border ${errorMsg ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-8`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className={`w-4 h-4 transition-transform ${isBankOpen ? 'rotate-180' : ''}`} />
            </div>
            {isBankOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                {filteredBanks.length > 0 ? (
                  filteredBanks.map(b => (
                    <div
                      key={b.shortName}
                      className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 text-slate-700 border-b border-slate-50 last:border-0"
                      onClick={() => {
                        const val = `${b.name} (${b.shortName})`;
                        handleFieldChange(field.key, val);
                        setBankQuery(`${b.shortName} - ${b.name}`);
                        setIsBankOpen(false);
                      }}
                    >
                      <div className="font-bold text-blue-700">{b.shortName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{b.name}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400 italic">Không tìm thấy</div>
                )}
              </div>
            )}
          </div>
          {errorMsg && <span className="text-xs text-red-500 italic animate-fadeIn">{errorMsg}</span>}
        </div>
      );
    }

    return (
      <InputField
        key={field.key}
        label={field.label}
        fieldKey={field.key}
        value={data[field.key] || ''}
        onChange={handleFieldChange}
        onBlur={onFieldBlur}
        placeholder={field.placeholder}
        type={field.type}
        options={field.options}
        error={errors[field.key]}
        required={true}
      />
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
          
          <div className="p-6 overflow-y-auto space-y-8 flex-1">
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" /> Thông tin cá nhân
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {profileFields.map(field => renderField(field))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" /> Ảnh Căn cước công dân (CCCD) & VNeID
              </h4>
              {data['vneid_level'] === '2' ? (
                <div className="grid grid-cols-2 gap-6">
                  {renderImageSlot('vneid2_1', 'VNeID mức 2 - Ảnh 1', imgVneid2_1Url)}
                  {renderImageSlot('vneid2_2', 'VNeID mức 2 - Ảnh 2', imgVneid2_2Url)}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {renderImageSlot('front', 'Mặt Trước', imgFrontUrl)}
                  {renderImageSlot('back', 'Mặt Sau', imgBackUrl)}
                  {renderImageSlot('portrait', 'Ảnh VNeID (Mức 1)', imgPortraitUrl)}
                </div>
              )}
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
