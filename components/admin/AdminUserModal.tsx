import React, { useState, useEffect } from 'react';
import {
  X, Loader2, AlertCircle, Building2, Shield, User, Mail, Info,
} from 'lucide-react';
import { UserProfile, Department } from '../../types';
import { createUser, updateUserProfile } from '../../services/adminService';

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
  const [departmentId, setDepartmentId] = useState<string>(editingUser?.department_id || '');
  const [role, setRole] = useState<'admin' | 'user'>(editingUser?.role || 'user');
  const [isActive, setIsActive] = useState<boolean>(editingUser?.is_active ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync state when editingUser changes
  useEffect(() => {
    if (editingUser) {
      setFullName(editingUser.full_name || '');
      setAccountName(editingUser.account_name || '');
      setDepartmentId(editingUser.department_id || '');
      setRole(editingUser.role || 'user');
      setIsActive(editingUser.is_active ?? true);
      setEmail(editingUser.email || '');
    } else {
      // Create mode
      setFullName('');
      setAccountName('');
      setEmail('');
      setDepartmentId(departments.length > 0 ? departments[0].id : '');
      setRole('user');
      setIsActive(true);
    }
    setError('');
  }, [editingUser, isOpen, departments]);

  // Tự động điền accountName theo email nếu chưa nhập
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!isEdit && (!accountName || accountName === email.split('@')[0])) {
      setAccountName(val.split('@')[0]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) { setError('Họ tên không được để trống.'); return; }

    if (!isEdit) {
      if (!email.trim()) { setError('Email không được để trống.'); return; }
      if (!email.includes('@')) { setError('Email không hợp lệ.'); return; }
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
      } else {
        await createUser({
          email: email.trim(),
          full_name: fullName.trim(),
          account_name: accountName.trim() || email.split('@')[0],
          department_id: departmentId || null,
          role,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi lưu tài khoản');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slideUp overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit ? 'Chỉnh sửa thông tin tài khoản' : 'Tạo tài khoản người dùng mới'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEdit ? (editingUser?.email || editingUser?.account_name) : 'Cấp quyền và phòng ban cho nhân viên'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Ghi chú Google Login */}
          {!isEdit && (
            <div className="flex items-start gap-2.5 bg-blue-50/80 border border-blue-200/70 rounded-xl p-3 text-xs text-blue-800">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Người dùng sẽ đăng nhập trực tiếp qua nút <strong>Google (@fpt.edu.vn)</strong> bằng email được cấp bên dưới, không cần mật khẩu.
              </span>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email (@fpt.edu.vn) <span className="text-red-500">*</span>
            </label>
            {isEdit ? (
              <div className="relative">
                <input
                  type="email"
                  value={editingUser?.email || email || 'Chưa cập nhật'}
                  disabled
                  className="w-full text-sm border border-slate-200 bg-slate-100/70 text-slate-500 rounded-xl px-3.5 py-2.5 cursor-not-allowed outline-none font-medium"
                />
              </div>
            ) : (
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="vd: phatdh4@fpt.edu.vn"
                  className="w-full text-sm border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="vd: Đỗ Hữu Phát"
              required
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
            />
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Tên tài khoản (Mã nhân viên / Username)
            </label>
            <input
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="vd: phatdh4"
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
              Phòng ban trực thuộc <span className="text-red-500">*</span>
            </label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              required
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white font-medium text-slate-800 transition-all"
            >
              <option value="">-- Chọn phòng ban & cơ sở --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.campus ? `${dept.campus.name} — ` : ''}{dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
              Phân quyền tài khoản
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['user', 'admin'] as const).map(r => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    role === r
                      ? r === 'admin'
                        ? 'border-purple-500 bg-purple-50/70 shadow-sm'
                        : 'border-blue-500 bg-blue-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="sr-only"
                  />
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      r === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {r === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 uppercase">{r === 'admin' ? 'Admin' : 'User'}</p>
                    <p className="text-[11px] text-slate-500">{r === 'admin' ? 'Toàn quyền quản trị' : 'Phòng ban được giao'}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Active Status (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">Trạng thái hoạt động</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isActive ? 'Tài khoản được phép đăng nhập và sử dụng hệ thống' : 'Tài khoản đã bị tạm khóa'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  isActive ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserModal;

