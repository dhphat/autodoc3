import { supabase } from './supabaseClient';
import { SavedProfile, Contract } from '../types';

// ======================== IMAGE HELPERS ========================

const compressImage = (file: File, maxWidth = 600, quality = 0.6): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export const uploadImage = async (
  file: File,
  profileId: string,
  type: 'front' | 'back' | 'portrait'
): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const compressed = await compressImage(file);
  const path = `${user.id}/${profileId}/${type}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('cccd-images')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('cccd-images')
    .getPublicUrl(path);

  return publicUrl;
};

export const deleteImage = async (url: string): Promise<void> => {
  if (!url) return;
  try {
    const bucketPath = url.split('/cccd-images/')[1];
    if (bucketPath) {
      await supabase.storage.from('cccd-images').remove([bucketPath]);
    }
  } catch (e) {
    console.warn('Failed to delete old image:', e);
  }
};

// ======================== PROFILES ========================

export const getProfiles = async (): Promise<SavedProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const saveProfile = async (
  profile: Omit<SavedProfile, 'id' | 'user_id' | 'created_at'>
): Promise<SavedProfile> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name: profile.name,
      data: profile.data,
      id_card_front_url: profile.id_card_front_url || null,
      id_card_back_url: profile.id_card_back_url || null,
      id_card_portrait_url: profile.id_card_portrait_url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProfile = async (profile: SavedProfile): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({
      name: profile.name,
      data: profile.data,
      id_card_front_url: profile.id_card_front_url || null,
      id_card_back_url: profile.id_card_back_url || null,
      id_card_portrait_url: profile.id_card_portrait_url || null,
    })
    .eq('id', profile.id);

  if (error) throw error;
};

export const deleteProfile = async (id: string): Promise<void> => {
  const { error, count } = await supabase
    .from('profiles')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  if (count === 0) throw new Error('Không thể xóa hồ sơ. Có thể bạn không có quyền xóa hồ sơ này.');
};

// ======================== CONTRACTS ========================

export const getContracts = async (): Promise<Contract[]> => {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, profiles(name, data)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    profile_id: item.profile_id,
    profile_name: item.profiles?.name || 'N/A',
    profile_data: item.profiles?.data || {},
    project_name: item.project_name || '',
    ngay_bat_dau: item.ngay_bat_dau || '',
    thang_bat_dau: item.thang_bat_dau || '',
    ngay_ket_thuc: item.ngay_ket_thuc || '',
    thang_ket_thuc: item.thang_ket_thuc || '',
    cong_viec: item.cong_viec || '',
    cong_viec_cu_the: item.cong_viec_cu_the || '',
    hinh_thuc: item.hinh_thuc || '',
    yeu_cau: item.yeu_cau || '',
    so_luong: item.so_luong || '1',
    don_gia: item.don_gia || '',
    thanh_tien: item.thanh_tien || '',
    bang_chu_thanh_tien: item.bang_chu_thanh_tien || '',
    thuc_nhan: item.thuc_nhan || '',
    bang_chu_thuc_nhan: item.bang_chu_thuc_nhan || '',
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
};

export const createContract = async (
  contract: Omit<Contract, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'profile_name' | 'profile_data'>
): Promise<Contract> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...contract, user_id: user.id })
    .select('*, profiles(name, data)')
    .single();

  if (error) throw error;

  return {
    ...data,
    profile_name: data.profiles?.name || 'N/A',
    profile_data: data.profiles?.data || {},
  };
};

export const updateContract = async (
  id: string,
  updates: Partial<Contract>
): Promise<void> => {
  const { profile_name, profile_data, ...dbUpdates } = updates;
  const { error } = await supabase
    .from('contracts')
    .update(dbUpdates)
    .eq('id', id);
  if (error) throw error;
};

export const deleteContract = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ======================== TEMPLATES ========================

export const uploadDefaultTemplate = async (file: File, type: 'contract' | 'acceptance'): Promise<void> => {
  const path = `defaults/${type}.docx`;
  const { error } = await supabase.storage
    .from('templates')
    .upload(path, file, { upsert: true });
  if (error) throw error;
};

export const downloadDefaultTemplate = async (type: 'contract' | 'acceptance'): Promise<File | null> => {
  const path = `defaults/${type}.docx`;
  const { data, error } = await supabase.storage
    .from('templates')
    .download(path);

  if (error) {
    if (error.message?.includes('not found') || error.message?.includes('Object not found')) return null;
    throw error;
  }

  return new File([data], `${type}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};
