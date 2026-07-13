import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, Loader2, UserCheck, UserX,
  Shield, User, AlertCircle, Building2, RefreshCw,
} from 'lucide-react';
import { UserProfile, Department } from '../../types';
import { getDepartments, deleteUser, updateUserProfile } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import AdminUserModal from './AdminUserModal';

interface UserManagementProps {
  users: UserProfile[];
  onRefresh: () => void;
  isLoading: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onRefresh, isLoading }) => {
  const { user: currentUser } = useUser();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !searchTerm ||
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.account_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = !filterDept || u.department_id === filterDept;
      const matchRole = !filterRole || u.role === filterRole;
      return matchSearch && matchDept && matchRole;
    });
  }, [users, searchTerm, filterDept, filterRole]);

  const openCreate = () => { setEditingUser(null); setModalOpen(true); };
  const openEdit = (u: UserProfile) => { setEditingUser(u); setModalOpen(true); };

  const handleDelete = async (u: UserProfile) => {
    if (u.id === currentUser?.id) {
      setError('Bạn không thể xóa tài khoản của chính mình.');
      return;
    }
    if (!window.confirm(`Xóa tài khoản "${u.full_name}"? Thao tác này không thể hoàn tác.`)) return;

    setIsDeleting(u.id);
    setError('');
    try {
      await deleteUser(u.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (u: UserProfile) => {
    if (u.id === currentUser?.id) {
      setError('Không thể vô hiệu hóa tài khoản của chính mình.');
      return;
    }
    try {
      await updateUserProfile(u.id, { is_active: !u.is_active });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <AdminUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingUser={editingUser}
        departments={departments}
        onSuccess={onRefresh}
      />

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên, tài khoản, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
        >
          <option value="">Tất cả quyền</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Thêm user
        </button>
      </div>

      {/* Info */}
      <p className="text-xs text-slate-400">
        Hiển thị {filteredUsers.length} / {users.length} tài khoản
      </p>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy tài khoản nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Tên</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Tài khoản</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />Phòng ban
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Quyền</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50/60 transition-colors ${u.id === currentUser?.id ? 'bg-indigo-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${u.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {u.full_name}
                            {u.id === currentUser?.id && <span className="ml-1.5 text-xs text-indigo-500 font-normal">(bạn)</span>}
                          </p>
                          {u.email && <p className="text-xs text-slate-400">{u.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{u.account_name || '—'}</td>
                    <td className="py-3 px-4">
                      {u.department ? (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                          {u.department.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">Chưa phân công</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={u.id === currentUser?.id}
                        title={u.is_active ? 'Click để vô hiệu hóa' : 'Click để kích hoạt'}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${u.is_active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                        } disabled:opacity-50 disabled:cursor-default`}
                      >
                        {u.is_active
                          ? <><UserCheck className="w-3 h-3" /> Hoạt động</>
                          : <><UserX className="w-3 h-3" /> Bị khóa</>
                        }
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={!!isDeleting || u.id === currentUser?.id}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Xóa tài khoản"
                        >
                          {isDeleting === u.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
