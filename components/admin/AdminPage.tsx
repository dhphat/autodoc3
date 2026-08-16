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
  const deptSet = new Set(users.map(u => u.department_id).filter(Boolean));
  // Tài khoản Google chờ Admin phê duyệt
  const pendingUsers = users.filter(u => !u.is_active && u.login_provider === 'google');
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const hasBadge = 'badge' in tab && (tab.badge as number) > 0;
            const isApprovalTab = tab.id === 'approvals';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? isApprovalTab && hasBadge
                      ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                      : 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : isApprovalTab && hasBadge
                      ? 'border-transparent text-amber-600 hover:bg-amber-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
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
                  className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setActiveTab('approvals')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        {pendingCount} tài khoản Google đang chờ phê duyệt
                      </p>
                      <p className="text-xs text-amber-600">Bấm để xem và phê duyệt ngay</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-500" />
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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
  }, []);

  const handleApprove = async (userId: string) => {
    const deptId = selectedDepts[userId] || '';
    if (!deptId) { setError('Vui lòng chọn phòng ban trước khi phê duyệt.'); return; }
    setProcessingId(userId);
    setError('');
    try {
      await updateUserProfile(userId, { is_active: true, department_id: deptId });
      setSuccessMsg('Đã phê duyệt tài khoản thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string, name: string) => {
    if (!window.confirm(`Từ chối và xóa tài khoản "${name}"? Họ sẽ cần đăng nhập lại từ đầu.`)) return;
    setProcessingId(userId);
    setError('');
    try {
      await deleteUser(userId);
      setSuccessMsg('Đã từ chối tài khoản.');
      setTimeout(() => setSuccessMsg(''), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Phê duyệt tài khoản Google</h2>
          <p className="text-xs text-slate-500 mt-0.5">Xem xét và kích hoạt tài khoản @fpt.edu.vn đăng nhập lần đầu</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{successMsg}
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-slate-600 font-medium">Không có tài khoản nào chờ phê duyệt</p>
          <p className="text-slate-400 text-sm mt-1">Tất cả tài khoản Google đã được xử lý</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map(u => (
            <div key={u.id} className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
              {/* User info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{u.full_name}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Chờ duyệt</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{u.email}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Đăng ký lúc: {new Date(u.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Phân công phòng ban + Action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-slate-100">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />Phân công phòng ban <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDepts[u.id] || ''}
                    onChange={e => setSelectedDepts(prev => ({ ...prev, [u.id]: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none bg-white"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.campus ? `${d.campus.name} - ` : ''}{d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 sm:flex-shrink-0">
                  <button
                    onClick={() => handleApprove(u.id)}
                    disabled={processingId === u.id || !selectedDepts[u.id]}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {processingId === u.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle className="w-3.5 h-3.5" />
                    }
                    Phê duyệt
                  </button>
                  <button
                    onClick={() => handleReject(u.id, u.full_name)}
                    disabled={processingId === u.id}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          ))}
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
