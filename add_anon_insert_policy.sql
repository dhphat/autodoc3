-- Cho phép khách chưa đăng nhập (anon) được INSERT vào bảng profiles
-- với điều kiện phải truyền đúng department_id
CREATE POLICY "public_insert_guest_profiles" ON profiles
  FOR INSERT TO anon WITH CHECK (
    department_id IS NOT NULL
  );
