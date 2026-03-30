
import React, { useRef, useState } from 'react';
import { Search, UserCircle, Eye, Upload, Image as ImageIcon, PlusCircle } from 'lucide-react';
import { SavedProfile } from '../types';
import { uploadImage, updateProfile } from '../services/supabaseService';
import ImagePreviewModal from './ImagePreviewModal';

interface ProfileListTabProps {
  profiles: SavedProfile[];
  onEdit: (profile: SavedProfile) => void;
  onProfileUpdated: (profile: SavedProfile) => void;
  onCreateNew: () => void;
}

const ProfileListTab: React.FC<ProfileListTabProps> = ({ profiles, onEdit, onProfileUpdated, onCreateNew }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ profileId: string; type: 'front' | 'back' | 'portrait' } | null>(null);

  const filteredProfiles = profiles.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.data['cccd'] || '').includes(searchTerm) ||
    (p.data['dien_thoai'] || '').includes(searchTerm) ||
    (p.data['mst'] || '').includes(searchTerm)
  );

  const handleUploadClick = (profileId: string, type: 'front' | 'back' | 'portrait') => {
    setUploadTarget({ profileId, type });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const { profileId, type } = uploadTarget;
    setUploadingFor(`${profileId}-${type}`);

    try {
      const url = await uploadImage(file, profileId, type);
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        const urlKey = type === 'front' ? 'id_card_front_url' : type === 'back' ? 'id_card_back_url' : 'id_card_portrait_url';
        const updated = { ...profile, [urlKey]: url };
        await updateProfile(updated);
        onProfileUpdated(updated);
      }
    } catch (err: any) {
      alert('Lỗi upload ảnh: ' + err.message);
    } finally {
      setUploadingFor(null);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderCccdIcon = (profile: SavedProfile, type: 'front' | 'back' | 'portrait', label: string) => {
    const urlKey = type === 'front' ? 'id_card_front_url' : type === 'back' ? 'id_card_back_url' : 'id_card_portrait_url';
    const url = profile[urlKey];
    const isUploading = uploadingFor === `${profile.id}-${type}`;
    const shortLabel = type === 'front' ? 'Tr' : type === 'back' ? 'Sau' : 'VNe';

    return (
      <div className="flex items-center gap-1" title={label}>
        <span className="text-[10px] text-slate-400 w-7">{shortLabel}</span>
        {url ? (
          <button onClick={(e) => { e.stopPropagation(); setPreviewImage({ url, title: `${profile.name} - ${label}` }); }}
            className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50 transition-colors" title="Xem ảnh">
            <Eye className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-slate-300 p-0.5"><ImageIcon className="w-3.5 h-3.5" /></span>
        )}
        <button onClick={(e) => { e.stopPropagation(); handleUploadClick(profile.id, type); }}
          disabled={isUploading}
          className={`p-0.5 rounded transition-colors ${isUploading ? 'text-slate-300' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
          title={url ? 'Thay ảnh' : 'Tải ảnh lên'}>
          {isUploading ? <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      <ImagePreviewModal isOpen={!!previewImage} imageUrl={previewImage?.url || null} title={previewImage?.title || ''} onClose={() => setPreviewImage(null)} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Quản Lý Hồ Sơ</h2>
            <p className="text-sm text-slate-500">{profiles.length} hồ sơ cá nhân</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Tìm tên, CCCD, SĐT, MST..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button onClick={onCreateNew}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap">
              <PlusCircle className="w-4 h-4" /> Tạo mới
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Họ tên</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Danh xưng</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">SĐT</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">CCCD</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">MST</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mã CBNV</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Ngân hàng</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">STK</th>
                <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Ảnh CCCD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{profiles.length === 0 ? 'Chưa có hồ sơ. Bấm "Tạo mới" để bắt đầu.' : 'Không tìm thấy kết quả.'}</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onEdit(profile)}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-sm text-slate-900">{profile.data['ho_ten'] || profile.name}</div>
                      {profile.data['ten_viet_tat'] && <div className="text-[10px] text-slate-400">{profile.data['ten_viet_tat']}</div>}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{profile.data['danh_xung'] || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{profile.data['dien_thoai'] || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-[150px] truncate">{profile.data['email'] || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono text-xs">{profile.data['cccd'] || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono text-xs">{profile.data['mst'] || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono text-xs">{profile.data['ma_cbnv'] || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-[120px] truncate">{profile.data['ngan_hang'] || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono text-xs">{profile.data['stk'] || '—'}</td>
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-0.5">
                        {renderCccdIcon(profile, 'front', 'Mặt trước')}
                        {renderCccdIcon(profile, 'back', 'Mặt sau')}
                        {renderCccdIcon(profile, 'portrait', 'VNeID')}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ProfileListTab;
