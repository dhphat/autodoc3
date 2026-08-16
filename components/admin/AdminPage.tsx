import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, ChevronRight, Loader2, RefreshCw,
  Shield, UserCheck, UserX, LayoutGrid, FileText, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import UserManagement from './UserManagement';
import DepartmentManagement from './DepartmentManagement';
import TemplateManagement from './TemplateManagement';
import { getUsers, getDepartments, updateUserProfile, deleteUser } from '../../services/adminService';
import { UserProfile, Department } from '../../types';

type AdminTab = 'overview' | 'users' | 'departments' | 'templates' | 'approvals';

const AdminPage: React.FC = () => {
  const { userProfile } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try { setUsers(await getUsers()); }
    catch (err) { console.error(err); }
    finally { setIsLoadingUsers(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  // Toàn bộ tài khoản chờ Admin phê duyệt & kích hoạt
  const pendingUsers = users.filter(u => !u.is_active);
  const pendingCount = pendingUsers.length;

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Tổng quan', icon: LayoutGrid },
    { id: 'approvals' as AdminTab, label: 'Phê duyệt', icon: Clock, badge: pendingCount },
    { id: 'users' as AdminTab, label: 'Quản lý User', icon: Users },
    { id: 'departments' as AdminTab, label: 'Phòng ban & Đơn vị', icon: Building2 },
    { id: 'templates' as AdminTab, label: 'Mẫu Tài Liệu', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Trang Quản trị</span>
            </div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-indigo-200 text-sm mt-1">
              Xin chào, <span className="font-semibold text-white">{userProfile?.full_name}</span>
            </p>
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoadingUsers}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="flex border-b border-slate-200/80 overflow-x-auto px-2 pt-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const hasBadge = 'badge' in tab && (tab.badge as number) > 0;
            const isApprovalTab = tab.id === 'approvals';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap flex-shrink-0 rounded-t-lg ${
                  activeTab === tab.id
                    ? isApprovalTab && hasBadge
                      ? 'border-amber-500 text-amber-700 bg-amber-50/60'
                      : 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                    : isApprovalTab && hasBadge
                      ? 'border-transparent text-amber-700 hover:bg-amber-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isApprovalTab && hasBadge ? 'text-amber-600' : ''}`} />
                {tab.label}
                {hasBadge && (
                  <span className="ml-1 px-2 py-0.5 bg-rose-500 text-white text-[11px] font-bold rounded-full shadow-sm">
                    {tab.badge as number}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="animate-fadeIn space-y-6">
              {/* Alert chờ duyệt nổi bật */}
              {pendingCount > 0 && (
                <div
                  className="flex items-center justify-between bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => setActiveTab('approvals')}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                        {pendingCount} tài khoản FPT đang chờ bạn phê duyệt
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200/80 text-amber-800 rounded-full">Mới</span>
                      </p>
                      <p className="text-xs text-amber-700/80 mt-0.5">Nhấp vào đây để phân công phòng ban và kích hoạt tài khoản</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                    Xem ngay <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Tổng số User"
                  value={isLoadingUsers ? '...' : totalUsers}
                  icon={<Users className="w-5 h-5 text-blue-600" />}
                  color="blue"
                />
                <StatCard
                  label="Đang hoạt động"
                  value={isLoadingUsers ? '...' : activeUsers}
                  icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
                  color="emerald"
                />
                <StatCard
                  label="Tài khoản Admin"
                  value={isLoadingUsers ? '...' : adminCount}
                  icon={<Shield className="w-5 h-5 text-purple-600" />}
                  color="purple"
                />
                <StatCard
                  label="Chờ phê duyệt"
                  value={isLoadingUsers ? '...' : pendingCount}
                  icon={<Clock className="w-5 h-5 text-amber-600" />}
                  color="amber"
                  highlight={pendingCount > 0}
                  onClick={() => setActiveTab('approvals')}
                />
              </div>

              {/* Quick actions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Thao tác nhanh</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingCount > 0 && (
                    <QuickAction
                      title={`Phê duyệt tài khoản (${pendingCount})`}
                      desc="Kích hoạt và phân công phòng ban cho user Google mới"
                      icon={<Clock className="w-5 h-5 text-amber-500" />}
                      onClick={() => setActiveTab('approvals')}
                      highlight
                    />
                  )}
                  <QuickAction
                    title="Quản lý User"
                    desc="Thêm, sửa, xóa tài khoản người dùng"
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    onClick={() => setActiveTab('users')}
                  />
                  <QuickAction
                    title="Quản lý Phòng ban"
                    desc="Cấu hình đơn vị và phòng ban"
                    icon={<Building2 className="w-5 h-5 text-indigo-600" />}
                    onClick={() => setActiveTab('departments')}
                  />
                  <QuickAction
                    title="Mẫu Tài Liệu"
                    desc="Upload và quản lý template hợp đồng, biên bản theo phòng ban"
                    icon={<FileText className="w-5 h-5 text-emerald-600" />}
                    onClick={() => setActiveTab('templates')}
                  />
                </div>
              </div>

              {/* Recent users */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">User gần đây</h3>
                <div className="space-y-2">
                  {isLoadingUsers ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                  ) : users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{u.full_name}</p>
                          <p className="text-xs text-slate-400">{u.department?.name || 'Chưa phân công'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                        {u.is_active
                          ? <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          : <UserX className="w-3.5 h-3.5 text-red-400" />
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <ApprovalTab
              pendingUsers={pendingUsers}
              isLoading={isLoadingUsers}
              onRefresh={loadUsers}
            />
          )}

          {activeTab === 'users' && (
            <UserManagement users={users} onRefresh={loadUsers} isLoading={isLoadingUsers} />
          )}

          {activeTab === 'departments' && (
            <DepartmentManagement />
          )}

          {activeTab === 'templates' && (
            <TemplateManagement />
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Helper sub-components ----

// ─── ApprovalTab ────────────────────────────────────────────────────────────
const ApprovalTab: React.FC<{
  pendingUsers: UserProfile[];
  isLoading: boolean;
  onRefresh: () => void;
}> = ({ pendingUsers, isLoading, onRefresh }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, 'user' | 'admin'>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
  }, []);

  const handleApprove = async (userId: string) => {
    const deptId = selectedDepts[userId] || '';
    if (!deptId) {
      setError('Vui lòng chọn phòng ban phân công trước khi phê duyệt.');
      return;
    }
    const role = selectedRoles[userId] || 'user';
    setProcessingId(userId);
    setError('');
    try {
      await updateUserProfile(userId, {
        is_active: true,
        department_id: deptId,
        role: role,
      });
      setSuccessMsg('Đã phê duyệt và kích hoạt tài khoản thành công!');
      setTimeout(() => setSuccessMsg(''), 3500);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi phê duyệt tài khoản');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string, name: string) => {
    if (!window.confirm(`Từ chối và xóa yêu cầu truy cập của "${name}"? Thao tác này không thể hoàn tác.`)) return;
    setProcessingId(userId);
    setError('');
    try {
      await deleteUser(userId);
      setSuccessMsg('Đã từ chối tài khoản.');
      setTimeout(() => setSuccessMsg(''), 3500);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi từ chối tài khoản');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm text-slate-500">Đang tải danh sách chờ phê duyệt...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Phê duyệt tài khoản FPT</h2>
            {pendingUsers.length > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                {pendingUsers.length} yêu cầu
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Xem xét, phân công phòng ban và kích hoạt tài khoản @fpt.edu.vn đăng nhập lần đầu
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới dữ liệu
        </button>
      </div>

      {/* Thông báo lỗi / thành công */}
      {error && (
        <div className="flex items-center gap-3 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm animate-fadeIn">
          <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-700 text-xs font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm animate-fadeIn">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Nội dung danh sách */}
      {pendingUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-emerald-100/80 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-slate-800 font-bold text-base">Không có tài khoản nào chờ phê duyệt</p>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            Tất cả tài khoản đăng nhập qua Google (@fpt.edu.vn) đã được phân công và kích hoạt.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingUsers.map(u => {
            const currentDept = selectedDepts[u.id] || '';
            const currentRole = selectedRoles[u.id] || 'user';
            const isProcessing = processingId === u.id;

            return (
              <div
                key={u.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                {/* 1. Header Card: Avatar & User Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl flex-shrink-0 shadow-md shadow-amber-500/20">
                      {u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{u.full_name}</h3>
                        <span className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Google
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">
                          <Clock className="w-3 h-3" /> Chờ phê duyệt
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 mt-1">{u.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Đăng nhập lần đầu: {new Date(u.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Cấu hình phân công: Phòng ban & Phân quyền */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* Chọn Phòng ban */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                        Phòng ban trực thuộc <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={currentDept}
                        onChange={e => setSelectedDepts(prev => ({ ...prev, [u.id]: e.target.value }))}
                        className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                      >
                        <option value="">-- Chọn phòng ban & cơ sở --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.campus ? `${d.campus.name} — ` : ''}{d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Chọn Quyền Role */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                        Vai trò hệ thống
                      </label>
                      <select
                        value={currentRole}
                        onChange={e => setSelectedRoles(prev => ({ ...prev, [u.id]: e.target.value as 'user' | 'admin' }))}
                        className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                      >
                        <option value="user">User (Người dùng)</option>
                        <option value="admin">Admin (Quản trị viên)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReject(u.id, u.full_name)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100/80 font-semibold text-xs transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Từ chối
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(u.id)}
                    disabled={isProcessing || !currentDept}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang kích hoạt...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" /> Phê duyệt & Kích hoạt
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── StatCard ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
  onClick?: () => void;
}> = ({ label, value, icon, color, highlight, onClick }) => {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50', emerald: 'bg-emerald-50', purple: 'bg-purple-50',
    orange: 'bg-orange-50', amber: 'bg-amber-50',
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
        highlight ? 'border-amber-300 ring-1 ring-amber-200 cursor-pointer hover:shadow-md' : 'border-slate-200'
      }`}
    >
      <div className={`w-9 h-9 ${bg[color]} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
};

// ─── QuickAction ─────────────────────────────────────────────────────────────
const QuickAction: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
  highlight?: boolean;
}> = ({ title, desc, icon, onClick, highlight }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 p-4 border rounded-xl text-left transition-colors group ${
      highlight
        ? 'bg-amber-50 hover:bg-amber-100 border-amber-200'
        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
    }`}
  >
    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <p className={`text-sm font-semibold ${highlight ? 'text-amber-800' : 'text-slate-800'}`}>{title}</p>
      <p className={`text-xs ${highlight ? 'text-amber-600' : 'text-slate-500'}`}>{desc}</p>
    </div>
    <ChevronRight className={`w-4 h-4 transition-colors ${highlight ? 'text-amber-400 group-hover:text-amber-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
  </button>
);

export default AdminPage;
