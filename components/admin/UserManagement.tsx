import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, Loader2, UserCheck, UserX,
  Shield, User, AlertCircle, Building2, RefreshCw, Clock,
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

// Biểu tượng Google "G" nhỏ
const GoogleIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const UserManagement: React.FC<UserManagementProps> = ({ users, onRefresh, isLoading }) => {
  const { user: currentUser } = useUser();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
  }, []);

  // ── Phân loại: Đang chờ duyệt vs Đang hoạt động ──────────────────
  const pendingUsers = useMemo(() =>
    users.filter(u => !u.is_active),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => u.is_active) // Bảng chính chỉ hiển thị user đã kích hoạt
      .filter(u => {
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

  // ── Kích hoạt Google user chờ duyệt + gán phòng ban ──────────────
  const handleApproveGoogleUser = async (u: UserProfile, departmentId: string) => {
    if (!departmentId) {
      setError('Vui lòng chọn phòng ban trước khi kích hoạt.');
      return;
    }
    setIsActivating(u.id);
    setError('');
    try {
      await updateUserProfile(u.id, { is_active: true, department_id: departmentId });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsActivating(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
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

      {/* ── Khu vực chờ duyệt ──────────────────────────────────────── */}
      {pendingUsers.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              Tài khoản Google chờ duyệt ({pendingUsers.length})
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingUsers.map(u => (
              <PendingUserRow
                key={u.id}
                user={u}
                departments={departments}
                isActivating={isActivating === u.id}
                onApprove={(deptId) => handleApproveGoogleUser(u, deptId)}
                onDelete={() => handleDelete(u)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────── */}
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

      <p className="text-xs text-slate-400">
        Hiển thị {filteredUsers.length} / {users.length} tài khoản
      </p>

      {/* ── Bảng danh sách user ────────────────────────────────────── */}
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
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            {u.full_name}
                            {u.id === currentUser?.id && <span className="text-xs text-indigo-500 font-normal">(bạn)</span>}
                            {/* Badge phân biệt Google / Email */}
                            {u.login_provider === 'google' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                <GoogleIcon /> Google
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                                ✉ Email
                              </span>
                            )}
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

// ── Row cho Google user chờ duyệt ────────────────────────────────────────────
const PendingUserRow: React.FC<{
  user: UserProfile;
  departments: Department[];
  isActivating: boolean;
  onApprove: (deptId: string) => void;
  onDelete: () => void;
}> = ({ user, departments, isActivating, onApprove, onDelete }) => {
  const [selectedDept, setSelectedDept] = useState('');

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            {user.full_name}
            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </span>
          </p>
          <p className="text-xs text-slate-400 truncate">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="text-xs border border-amber-300 bg-white rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-400 outline-none"
        >
          <option value="">-- Chọn phòng ban --</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>
              {d.campus ? `${d.campus.name} - ` : ''}{d.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => onApprove(selectedDept)}
          disabled={isActivating || !selectedDept}
          className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          {isActivating ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
          Duyệt
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          title="Từ chối"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default UserManagement;
