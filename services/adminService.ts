import { supabase } from './supabaseClient';
import { Campus, Department, UserProfile } from '../types';

// ======================== CAMPUS MANAGEMENT ========================

export const getCampuses = async (): Promise<Campus[]> => {
  const { data, error } = await supabase
    .from('campuses')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const createCampus = async (name: string): Promise<Campus> => {
  const { data, error } = await supabase
    .from('campuses')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCampus = async (id: string, name: string): Promise<void> => {
  const { error } = await supabase
    .from('campuses')
    .update({ name })
    .eq('id', id);
  if (error) throw error;
};

export const deleteCampus = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('campuses')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ======================== DEPARTMENT MANAGEMENT ========================

export const getDepartments = async (): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*, campus:campuses(*)')
    .order('name');
  if (error) throw error;
  return data as Department[] || [];
};

export const createDepartment = async (name: string, campus_id: string | null): Promise<Department> => {
  const { data, error } = await supabase
    .from('departments')
    .insert({ name, campus_id })
    .select('*, campus:campuses(*)')
    .single();
  if (error) throw error;
  return data as Department;
};

export const updateDepartment = async (id: string, name: string, campus_id: string | null): Promise<void> => {
  const { error } = await supabase
    .from('departments')
    .update({ name, campus_id })
    .eq('id', id);
  if (error) throw error;
};

export const deleteDepartment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ======================== USER MANAGEMENT ========================

export const getUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      department:departments(
        *,
        campus:campuses(*)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as UserProfile[] || [];
};

/**
 * Mời một người vào FES Contract: cấp quyền truy cập app trên FES Workspace và lưu lời mời
 * (họ tên, phòng ban, quyền). Hồ sơ được tạo và kích hoạt khi người đó đăng nhập lần đầu.
 */
export const inviteUser = async (params: {
  email: string;
  full_name: string;
  department_id: string | null;
  role: 'admin' | 'user';
}): Promise<void> => {
  const { error } = await supabase.rpc('admin_invite_user', {
    p_email: params.email.trim().toLowerCase(),
    p_full_name: params.full_name.trim(),
    p_department_id: params.department_id || null,
    p_role: params.role,
  });
  if (error) throw new Error(error.message || 'Không thể mời người dùng');
};

export const updateUserProfile = async (
  id: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'account_name' | 'department_id' | 'role' | 'is_active'>>
): Promise<void> => {
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
};
