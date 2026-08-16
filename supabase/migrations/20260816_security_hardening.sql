-- ====================================================================
-- MIGRATION: BẢO MẬT & CHUẨN HÓA ROW LEVEL SECURITY (RLS) - AUTODOC 3
-- Ngày tạo: 16/08/2026
-- Mục tiêu: 
-- 1. Triệt tiêu nguy cơ rò rỉ dữ liệu cá nhân (PII) qua role anon (Lỗi F-01 OWASP A01:2021)
-- 2. Đảm bảo cô lập dữ liệu theo phòng ban (Department Isolation)
-- 3. Bảo toàn 100% hoạt động của Guest Form (/form?dept=...) và xuất hợp đồng
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. BẬT ROW LEVEL SECURITY (RLS) CHO TOÀN BỘ CÁC BẢNG DỮ LIỆU
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 2. HÀM HELPER XÁC THỰC QUYỀN ADMIN & PHÒNG BAN (Tối ưu Performance & Clean Code)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_department_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT department_id FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- --------------------------------------------------------------------
-- 3. CHÍNH SÁCH BẢO MẬT: BẢNG CAMPUSES & DEPARTMENTS
-- --------------------------------------------------------------------
-- Xóa các policy cũ nếu có
DROP POLICY IF EXISTS "public_read_campuses" ON campuses;
DROP POLICY IF EXISTS "admin_all_campuses" ON campuses;
DROP POLICY IF EXISTS "public_read_departments" ON departments;
DROP POLICY IF EXISTS "admin_all_departments" ON departments;

-- Cho phép đọc công khai (cả anon và auth) để phục vụ resolve tên phòng ban trên Guest form & dropdown
CREATE POLICY "public_read_campuses" ON campuses
  FOR SELECT TO public
  USING (true);

CREATE POLICY "public_read_departments" ON departments
  FOR SELECT TO public
  USING (true);

-- Chỉ Admin mới được thêm/sửa/xóa campuses & departments
CREATE POLICY "admin_all_campuses" ON campuses
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_departments" ON departments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 4. CHÍNH SÁCH BẢO MẬT: BẢNG USER_PROFILES (Chặn hoàn toàn anon - Khắc phục F-01)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "user_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_read_all_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "public_read_user_profiles" ON user_profiles;

-- Thu hồi quyền SELECT của role anon trên user_profiles
REVOKE SELECT ON user_profiles FROM anon;

-- User tự đọc thông tin của chính mình
CREATE POLICY "user_read_own_profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin đọc được danh sách user
CREATE POLICY "admin_read_all_user_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admin cập nhật user_profiles
CREATE POLICY "admin_manage_user_profiles" ON user_profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 5. CHÍNH SÁCH BẢO MẬT: BẢNG PROFILES (Hồ sơ cá nhân & CCCD)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "public_insert_guest_profiles" ON profiles;
DROP POLICY IF EXISTS "user_select_department_profiles" ON profiles;
DROP POLICY IF EXISTS "user_insert_department_profiles" ON profiles;
DROP POLICY IF EXISTS "user_update_department_profiles" ON profiles;
DROP POLICY IF EXISTS "user_delete_department_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;

-- Thu hồi quyền SELECT, UPDATE, DELETE của role anon (Chặn đọc trộm dữ liệu CCCD)
REVOKE SELECT, UPDATE, DELETE ON profiles FROM anon;

-- 5.1. Cho phép Guest Form (anon) INSERT hồ sơ khi có department_id hợp lệ
CREATE POLICY "public_insert_guest_profiles" ON profiles
  FOR INSERT TO anon
  WITH CHECK (
    department_id IS NOT NULL 
    AND EXISTS (SELECT 1 FROM public.departments WHERE id = department_id)
  );

-- 5.2. Cán bộ đăng nhập được SELECT hồ sơ thuộc phòng ban mình (hoặc Admin xem hết)
CREATE POLICY "user_select_department_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  );

-- 5.3. Cán bộ đăng nhập INSERT hồ sơ vào phòng ban mình (hoặc Admin)
CREATE POLICY "user_insert_department_profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  );

-- 5.4. Cán bộ đăng nhập UPDATE hồ sơ thuộc phòng ban mình (hoặc Admin)
CREATE POLICY "user_update_department_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  )
  WITH CHECK (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  );

-- 5.5. Cán bộ đăng nhập DELETE hồ sơ thuộc phòng ban mình (hoặc Admin)
CREATE POLICY "user_delete_department_profiles" ON profiles
  FOR DELETE TO authenticated
  USING (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  );

-- --------------------------------------------------------------------
-- 6. CHÍNH SÁCH BẢO MẬT: BẢNG CONTRACTS (Hợp đồng & Nghiệm thu)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "user_select_contracts" ON contracts;
DROP POLICY IF EXISTS "user_modify_contracts" ON contracts;

-- Thu hồi toàn bộ quyền của role anon trên contracts
REVOKE ALL ON contracts FROM anon;

-- 6.1. Cán bộ xem hợp đồng thuộc phòng ban mình (hoặc Admin)
CREATE POLICY "user_select_contracts" ON contracts
  FOR SELECT TO authenticated
  USING (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  );

-- 6.2. Cán bộ quản lý (INSERT/UPDATE/DELETE) hợp đồng phòng ban mình (hoặc Admin)
CREATE POLICY "user_modify_contracts" ON contracts
  FOR ALL TO authenticated
  USING (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  )
  WITH CHECK (
    department_id = public.get_user_department_id() 
    OR public.is_admin()
  );

-- --------------------------------------------------------------------
-- 7. CHÍNH SÁCH STORAGE OBJECTS: BUCKET cccd-images & templates
-- --------------------------------------------------------------------
-- Cho phép khách nộp ảnh CCCD vào thư mục guest/
DROP POLICY IF EXISTS "anon_upload_guest_cccd_images" ON storage.objects;
DROP POLICY IF EXISTS "auth_manage_cccd_images" ON storage.objects;
DROP POLICY IF EXISTS "auth_read_templates" ON storage.objects;
DROP POLICY IF EXISTS "admin_manage_templates" ON storage.objects;

CREATE POLICY "anon_upload_guest_cccd_images" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'cccd-images' 
    AND (storage.foldername(name))[1] = 'guest'
  );

CREATE POLICY "auth_manage_cccd_images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cccd-images')
  WITH CHECK (bucket_id = 'cccd-images');

CREATE POLICY "auth_read_templates" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'templates');

CREATE POLICY "admin_manage_templates" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'templates' AND public.is_admin())
  WITH CHECK (bucket_id = 'templates' AND public.is_admin());
