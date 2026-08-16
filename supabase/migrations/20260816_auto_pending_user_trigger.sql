-- ================================================================
-- MIGRATION: TỰ ĐỘNG TẠO HỒ SƠ CHỜ PHÊ DUYỆT KHI USER FPT ĐĂNG NHẬP LẦN ĐẦU
-- Ngày: 2026-08-16
-- Mục tiêu:
-- 1. Bổ sung cột login_provider
-- 2. Cho phép người dùng mới đăng ký tự ghi nhận profile ở trạng thái chờ duyệt (is_active = false)
-- 3. Tự động trigger tạo profile chờ Admin phê duyệt ngay khi auth.users có bản ghi mới
-- ================================================================

-- 1. Bổ sung cột login_provider nếu chưa có
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS login_provider TEXT DEFAULT 'email'
  CHECK (login_provider IN ('email', 'google'));

-- 2. Policy cho phép User mới (authenticated) tự ghi nhận hồ sơ cá nhân của mình
DROP POLICY IF EXISTS "user_insert_own_profile" ON public.user_profiles;
CREATE POLICY "user_insert_own_profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 3. Hàm trigger tự động tạo profile chờ duyệt khi có user mới từ Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_provider TEXT;
  v_full_name TEXT;
  v_account_name TEXT;
BEGIN
  -- Xác định provider (google hoặc email)
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  
  -- Lấy họ tên
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_account_name := split_part(NEW.email, '@', 1);

  -- Chèn vào user_profiles với is_active = false (Chờ Admin phê duyệt & cấp phòng ban)
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    account_name,
    role,
    is_active,
    department_id,
    login_provider
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_account_name,
    'user',
    false, -- Mặc định luôn KHÓA / CHỜ DUYỆT cho tới khi Admin cấp quyền
    null,
    v_provider
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    login_provider = EXCLUDED.login_provider,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Kích hoạt trigger trên auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
