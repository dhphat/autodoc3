import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, ChevronRight, Loader2, RefreshCw,
  Shield, UserCheck, UserX, LayoutGrid,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import UserManagement from './UserManagement';
import DepartmentManagement from './DepartmentManagement';
import { getUsers } from '../../services/adminService';
import { UserProfile } from '../../types';

type AdminTab = 'overview' | 'users' | 'departments';

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

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Tổng quan', icon: LayoutGrid },
    { id: 'users' as AdminTab, label: 'Quản lý User', icon: Users },
    { id: 'departments' as AdminTab, label: 'Phòng ban & Đơn vị', icon: Building2 },
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
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="animate-fadeIn space-y-6">
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
                  label="Phòng ban"
                  value={isLoadingUsers ? '...' : deptSet.size}
                  icon={<Building2 className="w-5 h-5 text-orange-600" />}
                  color="orange"
                />
              </div>

              {/* Quick actions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Thao tác nhanh</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {activeTab === 'users' && (
            <UserManagement users={users} onRefresh={loadUsers} isLoading={isLoadingUsers} />
          )}

          {activeTab === 'departments' && (
            <DepartmentManagement />
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Helper sub-components ----

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50', emerald: 'bg-emerald-50', purple: 'bg-purple-50', orange: 'bg-orange-50'
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className={`w-9 h-9 ${bg[color]} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
};

const QuickAction: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, desc, icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors group"
  >
    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
  </button>
);

export default AdminPage;
