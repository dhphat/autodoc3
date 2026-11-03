import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { submitHubLogout } from '../services/hubLinks';
import type { User } from '@supabase/supabase-js';

interface UserContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  departmentId: string | null;
  isLoading: boolean;
  pendingApproval: boolean; // tài khoản đang chờ Admin duyệt
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  userProfile: null,
  isAdmin: false,
  departmentId: null,
  isLoading: true,
  pendingApproval: false,
  refreshProfile: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: ReactNode; user: User }> = ({ children, user }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    setPendingApproval(false);

    try {
      // 1. Lấy (hoặc tạo) hồ sơ của chính mình: hồ sơ đã có / theo lời mời của Admin / chờ duyệt.
      const { data: claimed, error: claimError } = await supabase.rpc('claim_profile');
      if (claimError) throw claimError;

      const profile = claimed as UserProfile | null;
      // 2. Tài khoản chưa được kích hoạt (đang chờ Admin phê duyệt)
      if (!profile || !profile.is_active) {
        setPendingApproval(true);
        setUserProfile(null);
        return;
      }

      // 3. Đọc kèm phòng ban / cơ sở để hiển thị
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          department:departments(
            *,
            campus:campuses(*)
          )
        `)
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;

      setUserProfile((data ?? profile) as UserProfile);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      // Mặc định cho vào màn hình chờ duyệt nếu có tài khoản auth nhưng chưa có quyền
      setPendingApproval(true);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  // Nếu user chờ duyệt hoặc bị khóa → hiển thị màn hình thông báo
  if (!isLoading && pendingApproval) {
    return (
      <UserContext.Provider value={{ user, userProfile: null, isAdmin: false, departmentId: null, isLoading: false, pendingApproval: true, refreshProfile: fetchProfile }}>
        <PendingApprovalScreen email={user.email || ''} onSignOut={submitHubLogout} />
      </UserContext.Provider>
    );
  }

  const value: UserContextValue = {
    user,
    userProfile,
    isAdmin: userProfile?.role === 'admin',
    departmentId: userProfile?.department_id ?? null,
    isLoading,
    pendingApproval,
    refreshProfile: fetchProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// ── Màn hình chờ duyệt (đăng nhập lần đầu, chưa được Admin kích hoạt) ─────────
const PendingApprovalScreen: React.FC<{ email: string; onSignOut: () => void }> = ({ email, onSignOut }) => (
  <div data-testid="pending-approval" className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
    </div>
    <div className="relative w-full max-w-md text-center">
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-500/20 border border-amber-400/30 rounded-2xl mx-auto mb-5 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Tài khoản đang chờ duyệt</h2>
        <p className="text-blue-200/60 text-sm mb-1">
          Bạn đã đăng nhập thành công với
        </p>
        <p className="text-amber-300 font-medium text-sm mb-5">{email}</p>
        <p className="text-blue-200/50 text-sm leading-relaxed mb-6">
          Tài khoản của bạn đã được ghi nhận. Vui lòng liên hệ <strong className="text-white">Admin</strong> để được kích hoạt và phân công phòng ban trước khi sử dụng hệ thống.
        </p>

        <button
          onClick={onSignOut}
          className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2.5 rounded-lg font-medium text-sm transition-all"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  </div>
);

export default UserContext;
