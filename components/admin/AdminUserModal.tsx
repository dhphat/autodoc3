import React, { useState, useEffect } from 'react';
import {
  X, Loader2, Eye, EyeOff, AlertCircle, Building2, Shield, User,
} from 'lucide-react';
import { UserProfile, Department } from '../../types';
import { createUser, updateUserProfile, resetUserPassword } from '../../services/adminService';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: UserProfile | null; // null = create mode
  departments: Department[];
  onSuccess: () => void;
}

const AdminUserModal: React.FC<AdminUserModalProps> = ({
  isOpen, onClose, editingUser, departments, onSuccess,
}) => {
  const isEdit = !!editingUser;

  const [fullName, setFullName] = useState(editingUser?.full_name || '');
  const [accountName, setAccountName] = useState(editingUser?.account_name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departmentId, setDepartmentId] = useState<string>(editingUser?.department_id || '');
  const [role, setRole] = useState<'admin' | 'user'>(editingUser?.role || 'user');
  const [isActive, setIsActive] = useState<boolean>(editingUser?.is_active ?? true);

  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync state when editingUser changes (e.g. when opening modal for a different user)
  useEffect(() => {
    if (editingUser) {
      setFullName(editingUser.full_name || '');
      setAccountName(editingUser.account_name || '');
      setDepartmentId(editingUser.department_id || '');
      setRole(editingUser.role || 'user');
      setIsActive(editingUser.is_active ?? true);
      // Reset password fields
      setShowResetPassword(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      // Create mode
      setFullName('');
      setAccountName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDepartmentId(departments.length > 0 ? departments[0].id : '');
      setRole('user');
      setIsActive(true);
      setShowResetPassword(false);
    }
    setError('');
  }, [editingUser, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) { setError('Họ tên không được để trống.'); return; }

    if (!isEdit) {
      if (!email.trim()) { setError('Email không được để trống.'); return; }
      if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
      if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    }

    setIsSaving(true);
    try {
      if (isEdit && editingUser) {
        await updateUserProfile(editingUser.id, {
          full_name: fullName.trim(),
          account_name: accountName.trim() || null,
          department_id: departmentId || null,
          role,
          is_active: isActive,
        });

        if (showResetPassword && newPassword) {
          if (newPassword.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
          if (newPassword !== confirmNewPassword) throw new Error('Mật khẩu xác nhận không khớp.');
          await resetUserPassword(editingUser.id, newPassword);
        }
      } else {
        await createUser({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          account_name: accountName.trim(),
          department_id: departmentId || null,
          role,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              {isEdit ? <User className="w-5 h-5 text-indigo-600" /> : <User className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
              </h2>
              {isEdit && editingUser && (
                <p className="text-xs text-slate-400">{editingUser.email || editingUser.account_name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
            />
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Tên tài khoản
            </label>
            <input
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="nguyenvana"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
            />
          </div>

          {/* Email */}
          {isEdit ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email đăng nhập</label>
              <input
                type="email"
                value={editingUser?.email || email || 'Đang cập nhật...'}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">* Email không thể thay đổi sau khi tạo</p>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email đăng nhập <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: nguyenvana@fpt.edu.vn"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
              />
            </div>
          )}

          {/* Password (create only) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 pr-9 focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Xác nhận MK <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-400 outline-none"
                />
              </div>
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <Building2 className="w-3.5 h-3.5 inline-block mr-1 mb-0.5" />
              Phòng ban
            </label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
            >
              <option value="">-- Chưa phân công --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.campus ? `${dept.campus.name} - ` : ''}{dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <Shield className="w-3.5 h-3.5 inline-block mr-1 mb-0.5" />
              Phân quyền
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['user', 'admin'] as const).map(r => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${role === r ? (r === 'admin' ? 'border-purple-400 bg-purple-50' : 'border-blue-400 bg-blue-50') : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                    {r === 'admin' ? <Shield className="w-4 h-4 text-purple-600" /> : <User className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{r === 'admin' ? 'Admin' : 'User'}</p>
                    <p className="text-xs text-slate-400">{r === 'admin' ? 'Toàn quyền' : 'Phòng ban'}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Active Status (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">Trạng thái tài khoản</p>
                <p className="text-xs text-slate-400">{isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {/* Reset Password (edit only) */}
          {isEdit && (
            <div className="border border-dashed border-slate-300 rounded-xl p-4">
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                {showResetPassword ? 'Ẩn đặt lại mật khẩu' : 'Đặt lại mật khẩu'}
              </button>
              {showResetPassword && (
                <div className="grid grid-cols-2 gap-3 mt-3 animate-fadeIn">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Xác nhận</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      placeholder="Nhập lại"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserModal;
