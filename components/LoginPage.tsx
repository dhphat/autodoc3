import React from 'react';
import { AlertCircle, LogIn, ShieldCheck } from 'lucide-react';
import { hubLoginHref } from '../services/hubLinks';

interface LoginPageProps {
  authError?: string; // Lỗi khi kiểm tra quyền truy cập FES Workspace (App.tsx)
}

// Đăng nhập do FES Workspace (hub) đảm nhận; trang này chỉ hiện khi không kiểm tra được quyền.
const LoginPage: React.FC<LoginPageProps> = ({ authError }) => {
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

          {authError && (
            <div className="flex items-start gap-2.5 text-amber-200 text-xs bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-3 mb-6 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <span className="leading-relaxed">{authError}</span>
            </div>
          )}

          <div className="space-y-4">
            <a
              id="btn-workspace-login"
              href={hubLoginHref()}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 py-3.5 px-5 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-black/20 hover:shadow-2xl border border-white"
            >
              <LogIn className="w-5 h-5 flex-shrink-0 text-slate-600" />
              Đăng nhập qua FES Workspace
            </a>

            <div className="flex items-center justify-center gap-1.5 text-xs text-blue-200/40 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
              <span>Một tài khoản cho mọi ứng dụng FES Workspace</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
