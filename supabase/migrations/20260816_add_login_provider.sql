-- ================================================================
-- Migration: Thêm cột login_provider vào user_profiles
-- Mục đích: Phân biệt user đăng nhập Email/Password vs Google OAuth
-- Ngày: 2026-08-16
-- ================================================================

-- 1. Thêm cột login_provider (mặc định 'email' cho user hiện có)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS login_provider TEXT DEFAULT 'email'
  CHECK (login_provider IN ('email', 'google'));

-- 2. Cập nhật comment mô tả
COMMENT ON COLUMN user_profiles.login_provider IS 'Phương thức đăng nhập: email hoặc google';

-- 3. Kiểm tra kết quả
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'login_provider';
