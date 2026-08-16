-- ================================================================
-- MIGRATION: CẬP NHẬT RLS USER_PROFILES CHO PHÉP ĐỌC THEO EMAIL/ID
-- Mục đích: Đảm bảo user đăng nhập Google luôn tìm thấy hồ sơ của mình
-- ================================================================

DROP POLICY IF EXISTS "user_read_own_profile" ON public.user_profiles;

CREATE POLICY "user_read_own_profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR LOWER(email) = LOWER(auth.jwt()->>'email')
  );
