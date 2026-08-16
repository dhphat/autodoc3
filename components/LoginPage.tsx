import React, { useState } from 'react';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const ALLOWED_DOMAIN = 'fpt.edu.vn';

interface LoginPageProps {
  authError?: string; // Lỗi domain từ App.tsx (Google OAuth)
}

const LoginPage: React.FC<LoginPageProps> = ({ authError }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Đăng nhập Google SSO ─────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối Google. Vui lòng thử lại.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      {/* Hiệu ứng ánh sáng nền */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slideUp">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 sm:p-10 shadow-2xl">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <img
              src="/favicon.png"
              alt="FES Contract Logo"
              className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-xl shadow-blue-500/20 object-cover ring-2 ring-white/20"
            />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">FES Contract</h1>
            <p className="text-blue-200/60 text-xs mt-1.5 font-medium tracking-wide">
              Hệ thống tạo & quản lý hợp đồng — FPT Education
            </p>
          </div>

          {/* ── Lỗi domain OAuth ──────────────────────────────────── */}
          {authError && (
            <div className="flex items-start gap-2.5 text-amber-200 text-xs bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-3 mb-6 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <span className="leading-relaxed">{authError}</span>
            </div>
          )}

          {/* ── Lỗi kết nối Google ───────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2.5 text-red-200 text-xs bg-red-500/15 border border-red-400/30 rounded-xl px-4 py-3 mb-6 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* ── Nút Đăng nhập Google Duy Nhất ───────────────────── */}
          <div className="space-y-4">
            <button
              id="btn-google-login"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:scale-[0.98] disabled:bg-slate-200 text-slate-800 disabled:text-slate-400 py-3.5 px-5 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-black/20 hover:shadow-2xl border border-white"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {googleLoading ? 'Đang xác thực Google...' : 'Đăng nhập với Google (@fpt.edu.vn)'}
            </button>

            {/* Footer an ninh */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-blue-200/40 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
              <span>Xác thực an toàn qua Google Workspace FPT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
