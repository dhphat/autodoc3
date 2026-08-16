-- ================================================================
-- MIGRATION: HÀM RPC ADMIN_CREATE_USER
-- Mục đích: Cho phép Admin tạo User an toàn trực tiếp từ Dashboard
--           Không bị lỗi duplicate key, không cần deploy Edge Function
-- Ngày: 2026-08-16
-- ================================================================

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_full_name TEXT,
  p_account_name TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT 'user'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_provider TEXT;
BEGIN
  -- 1. Kiểm tra quyền Admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin role required';
  END IF;

  -- 2. Kiểm tra tham số email
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  p_email := LOWER(TRIM(p_email));

  v_provider := CASE 
    WHEN p_email LIKE '%@fpt.edu.vn' OR p_email LIKE '%@fe.edu.vn' THEN 'google' 
    ELSE 'email' 
  END;

  -- 3. Kiểm tra xem user đã tồn tại trong auth.users chưa
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_email LIMIT 1;

  -- Nếu chưa có trong auth.users, tạo tài khoản auth mới
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      extensions.crypt(p_email || '_fpt_pass_temp', extensions.gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', v_provider, 'providers', jsonb_build_array(v_provider)),
      jsonb_build_object('full_name', p_full_name),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  END IF;

  -- 4. Tạo hoặc cập nhật user_profiles (upsert an toàn 100%)
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    account_name,
    department_id,
    role,
    is_active,
    login_provider,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    COALESCE(NULLIF(TRIM(p_account_name), ''), split_part(p_email, '@', 1)),
    p_department_id,
    COALESCE(p_role, 'user'),
    true,
    v_provider,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    account_name = EXCLUDED.account_name,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    is_active = true,
    login_provider = EXCLUDED.login_provider,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'id', v_user_id, 'email', p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
