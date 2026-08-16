import { supabase } from './supabaseClient';
import { Campus, Department, UserProfile } from '../types';

const MANAGE_USER_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`;

// ======================== EDGE FUNCTION CALLER ========================

const callManageUser = async (payload: Record<string, any>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(MANAGE_USER_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Function call failed');
  return json;
};

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

export const createUser = async (params: {
  email: string;
  password?: string;
  full_name: string;
  account_name: string;
  department_id: string | null;
  role: 'admin' | 'user';
}): Promise<{ id: string; email: string }> => {
  // 1. Thử gọi RPC admin_create_user (nhanh, bảo mật và an toàn 100%)
  try {
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: params.email,
      p_full_name: params.full_name,
      p_account_name: params.account_name || null,
      p_department_id: params.department_id || null,
      p_role: params.role || 'user',
    });

    if (!error && data?.success) {
      return { id: data.id, email: params.email };
    }
  } catch (rpcErr) {
    console.warn('RPC admin_create_user failed, falling back to manage-user:', rpcErr);
  }

  // 2. Fallback sang Edge Function
  const secureRandomPassword = `FPT_${Math.random().toString(36).slice(-8)}!Aa9_${Date.now()}`;
  try {
    return await callManageUser({
      action: 'create',
      password: params.password || secureRandomPassword,
      ...params,
    });
  } catch (err: any) {
    // 3. Fallback: Cập nhật trực tiếp user_profiles nếu user đã có profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', params.email)
      .maybeSingle();

    if (existingProfile) {
      const isFptEmail = params.email.endsWith('@fpt.edu.vn') || params.email.endsWith('@fe.edu.vn');
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({
          full_name: params.full_name,
          account_name: params.account_name || params.email.split('@')[0],
          department_id: params.department_id,
          role: params.role,
          is_active: true,
          login_provider: isFptEmail ? 'google' : 'email',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);

      if (!updateErr) {
        return { id: existingProfile.id, email: params.email };
      }
    }
    throw err;
  }
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

export const resetUserPassword = async (user_id: string, new_password: string): Promise<void> => {
  return callManageUser({ action: 'update_password', user_id, new_password });
};

export const deleteUser = async (user_id: string): Promise<void> => {
  return callManageUser({ action: 'delete', user_id });
};
