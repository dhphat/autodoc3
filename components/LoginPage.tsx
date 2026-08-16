import React, { useState } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const ALLOWED_DOMAIN = 'fpt.edu.vn';

interface LoginPageProps {
  authError?: string; // Lỗi domain từ App.tsx (Google OAuth)
}

const LoginPage: React.FC<LoginPageProps> = ({ authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  // Form email/password ẩn mặc định, click "Đăng nhập quản trị" để mở
  const [showEmailForm, setShowEmailForm] = useState(false);

  // ── Đăng nhập Email/Password ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  // ── Đăng nhập Google (chỉ @fpt.edu.vn) ───────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { hd: ALLOWED_DOMAIN },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối Google. Vui lòng thử lại.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slideUp">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Logo & Title */}
          <div className="text-center mb-8">
            <img
              src="/favicon.png"
              alt="FES Contract Logo"
              className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg shadow-blue-500/25 object-cover"
            />
            <h1 className="text-2xl font-bold text-white tracking-tight">FES Contract</h1>
            <p className="text-blue-300/50 text-sm mt-1">Hệ thống quản lý hợp đồng</p>
          </div>

          {/* ── Lỗi domain OAuth ──────────────────────────────────── */}
          {authError && (
            <div className="flex items-start gap-2 text-amber-300 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-4 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* ── Nút Google (phương thức chính) ───────────────────── */}
          <button
            id="btn-google-login"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:bg-gray-200 text-gray-700 disabled:text-gray-400 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg mb-6 border border-white/20"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {googleLoading ? 'Đang chuyển hướng...' : 'Đăng nhập với Google (@fpt.edu.vn)'}
          </button>

          {/* ── Lỗi chung (cả Email và Google) ───────────────────── */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Toggle form Email/Password (ẩn mặc định) ─────────── */}
          <button
            id="btn-toggle-email-form"
            type="button"
            onClick={() => { setShowEmailForm(v => !v); setError(''); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors py-1"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showEmailForm ? 'rotate-180' : ''}`}
            />
            {showEmailForm ? 'Ẩn đăng nhập quản trị' : 'Đăng nhập quản trị'}
          </button>

          {/* ── Form Email/Password (ẩn/hiện theo toggle) ───────── */}
          {showEmailForm && (
            <form onSubmit={handleSubmit} className="space-y-3 mt-4 pt-4 border-t border-white/10 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-blue-200/50 uppercase tracking-wider">Email</label>
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fpt.edu.vn"
                  required
                  autoComplete="username"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-blue-200/50 uppercase tracking-wider">Mật khẩu</label>
                <input
                  id="input-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                />
              </div>

              <button
                id="btn-email-login"
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/15 text-white py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Đăng nhập
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
