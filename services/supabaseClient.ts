import { createClient } from '@supabase/supabase-js';
import { createWorkspaceBrowserClient } from './workspace-auth';

// Phiên đăng nhập FES Workspace (cookie chung sb-fes-auth); dữ liệu nằm trong schema "contract".
export const supabase = createWorkspaceBrowserClient({ schema: 'contract' });

/**
 * Client ẩn danh cho form khách (/form): luôn chạy với role anon, không đọc cookie phiên,
 * nên người đã đăng nhập workspace (kể cả không có quyền FES Contract) vẫn gửi form như khách.
 */
export function createGuestClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) throw new Error('Missing environment variable VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  return createClient(url, anonKey, {
    db: { schema: 'contract' },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
