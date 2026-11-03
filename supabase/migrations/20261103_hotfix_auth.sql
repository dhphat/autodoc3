-- ================================================================
-- MIGRATION: HOTFIX BẢO MẬT AUTH (2026-11-03)
-- 1. Xóa mật khẩu đoán được (<email>_fpt_secure_salt) của user Google
-- 2. admin_create_user không còn đặt encrypted_password
-- 3. Chặn tự leo quyền: user chỉ được tự tạo profile role='user', is_active=false
-- 4. Thêm set search_path = '' cho các hàm SECURITY DEFINER
-- 5. Storage cccd-images: chỉ admin hoặc user đã được duyệt (có phòng ban)
-- ================================================================

-- 1. Vô hiệu hóa mật khẩu đã biết trước của tài khoản Google
UPDATE auth.users
SET encrypted_password = NULL
WHERE raw_app_meta_data->>'provider' = 'google'
  AND encrypted_password IS NOT NULL;

-- 2. admin_create_user: không đặt mật khẩu, search_path rỗng
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_full_name TEXT,
  p_account_name TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT 'user'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Yêu cầu quyền Quản trị viên (Admin)';
  END IF;

  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'Email không được để trống';
  END IF;

  p_email := LOWER(TRIM(p_email));

  IF NOT (p_email LIKE '%@fpt.edu.vn') THEN
    RAISE EXCEPTION 'Chỉ chấp nhận tài khoản có đuôi email @fpt.edu.vn';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
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
      NOW(),
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'google', 'providers', jsonb_build_array('google')),
      jsonb_build_object('full_name', p_full_name),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  END IF;

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
    'google',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    account_name = EXCLUDED.account_name,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    is_active = true,
    login_provider = 'google',
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'id', v_user_id, 'email', p_email);
END;
$$;

-- 3. Chặn tự leo quyền qua user_insert_own_profile
DROP POLICY IF EXISTS "user_insert_own_profile" ON public.user_profiles;
CREATE POLICY "user_insert_own_profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'user' AND is_active = false);

-- 4. search_path rỗng cho các hàm SECURITY DEFINER còn lại
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_department_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT department_id FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider TEXT;
  v_full_name TEXT;
  v_account_name TEXT;
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(NEW.email));
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(v_email, '@', 1)
  );

  v_account_name := split_part(v_email, '@', 1);

  INSERT INTO public.user_profiles (
    id, email, full_name, account_name, role, is_active, department_id, login_provider
  )
  VALUES (
    NEW.id, v_email, v_full_name, v_account_name, 'user', false, null, v_provider
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    login_provider = EXCLUDED.login_provider,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 5. Storage cccd-images: chặn tài khoản chờ duyệt / người ngoài.
-- is_admin() và get_user_department_id() đều yêu cầu is_active = true.
DROP POLICY IF EXISTS "auth_manage_cccd_images" ON storage.objects;
CREATE POLICY "auth_manage_cccd_images" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'cccd-images'
    AND (public.is_admin() OR public.get_user_department_id() IS NOT NULL)
  )
  WITH CHECK (
    bucket_id = 'cccd-images'
    AND (public.is_admin() OR public.get_user_department_id() IS NOT NULL)
  );
