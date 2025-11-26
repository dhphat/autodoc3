
import React from 'react';
import { Edit2, Trash2, Search, UserCircle } from 'lucide-react';
import { SavedProfile } from '../types';

interface ProfileListTabProps {
  profiles: SavedProfile[];
  onEdit: (profile: SavedProfile) => void;
  onDelete: (id: string) => void;
}

const ProfileListTab: React.FC<ProfileListTabProps> = ({ profiles, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredProfiles = profiles.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Danh sách hồ sơ</h2>
          <p className="text-sm text-slate-500">Quản lý các thông tin cá nhân đã lưu.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm hồ sơ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder-slate-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên hồ sơ</th>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thông tin chính</th>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có hồ sơ nào.</p>
                </td>
              </tr>
            ) : (
              filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onEdit(profile)}>
                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-900">{profile.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-xs text-slate-500 space-y-1">
                      <div><span className="font-medium">SĐT:</span> {profile.data['dien_thoai'] || '---'}</div>
                      <div className="truncate max-w-[200px]"><span className="font-medium">Email:</span> {profile.data['email'] || '---'}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500">
                    {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(profile); }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Sửa
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfileListTab;
