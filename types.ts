
export interface DocField {
  key: string;
  label: string;
  value: string;
  placeholder?: string;
  section?: 'General' | 'Party A' | 'Party B' | 'Financial' | 'Job' | 'Time' | 'Other';
  type?: 'text' | 'number' | 'select' | 'date' | 'textarea';
  options?: { label: string; value: string }[];
  error?: string;
}

export interface TemplateFile {
  name: string;
  file: File;
  type: 'contract' | 'acceptance';
  uploadedAt: Date;
}

export type TemplateType = 'contract' | 'acceptance';

export interface SavedProfile {
  id: string;
  user_id?: string;
  name: string;
  data: Record<string, string>;
  id_card_front_url?: string | null;
  id_card_back_url?: string | null;
  id_card_portrait_url?: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  user_id?: string;
  profile_id: string;
  profile_name?: string;
  profile_data?: Record<string, string>;
  project_name: string;
  ngay_bat_dau: string;
  thang_bat_dau: string;
  ngay_ket_thuc: string;
  thang_ket_thuc: string;
  cong_viec: string;
  cong_viec_cu_the: string;
  hinh_thuc: string;
  yeu_cau: string;
  so_luong: string;
  don_gia: string;
  thanh_tien: string;
  bang_chu_thanh_tien: string;
  thuc_nhan: string;
  bang_chu_thuc_nhan: string;
  created_at: string;
  updated_at: string;
}

// Fields based on user request
export const DEFAULT_FIELDS: DocField[] = [
  // Time Information
  { key: 'ngay_bat_dau', label: 'Ngày bắt đầu', value: '28', section: 'Time', placeholder: 'DD', type: 'number' },
  { key: 'thang_bat_dau', label: 'Tháng bắt đầu', value: '04', section: 'Time', placeholder: 'MM', type: 'number' },
  { key: 'ngay_ket_thuc', label: 'Ngày kết thúc', value: '02', section: 'Time', placeholder: 'DD', type: 'number' },
  { key: 'thang_ket_thuc', label: 'Tháng kết thúc', value: '05', section: 'Time', placeholder: 'MM', type: 'number' },

  // Personal Information (Party B / Individual)
  { 
    key: 'danh_xung', 
    label: 'Ông/Bà', 
    value: 'Ông', 
    section: 'Party B', 
    placeholder: 'Ông/Bà',
    type: 'select',
    options: [
      { label: 'Ông', value: 'Ông' },
      { label: 'Bà', value: 'Bà' }
    ]
  },
  { key: 'ho_ten', label: 'Họ tên', value: '', section: 'Party B', placeholder: 'Họ và tên đầy đủ' },
  { key: 'ten_viet_tat', label: 'Tên viết tắt', value: '', section: 'Party B', placeholder: 'VD: PHA' },
  { key: 'ngay_sinh', label: 'Ngày sinh', value: '', section: 'Party B', placeholder: 'Ngày sinh', type: 'date' },
  { key: 'dia_chi', label: 'Địa chỉ', value: '', section: 'Party B', placeholder: 'Địa chỉ thường trú/liên hệ' },
  { key: 'dien_thoai', label: 'Điện thoại', value: '', section: 'Party B', placeholder: 'Số điện thoại' },
  { key: 'email', label: 'Email', value: '', section: 'Party B', placeholder: 'Email' },
  { key: 'mst', label: 'MST', value: '', section: 'Party B', placeholder: 'Mã số thuế cá nhân' },
  { key: 'cccd', label: 'CCCD', value: '', section: 'Party B', placeholder: 'Số CCCD/CMND' },
  { key: 'ngay_cap', label: 'Ngày cấp', value: '', section: 'Party B', placeholder: 'Ngày cấp CCCD', type: 'date' },
  { key: 'noi_cap', label: 'Nơi cấp', value: '', section: 'Party B', placeholder: 'Nơi cấp CCCD' },

  // Payment Info
  { key: 'stk', label: 'STK', value: '', section: 'Party B', placeholder: 'Số tài khoản ngân hàng' },
  { 
    key: 'ngan_hang', 
    label: 'Ngân hàng', 
    value: '', 
    section: 'Party B', 
    placeholder: 'Chọn ngân hàng',
    type: 'select',
    options: []
  },
  { key: 'chi_nhanh', label: 'Chi nhánh', value: '', section: 'Party B', placeholder: 'Chi nhánh ngân hàng' },

  // Job Details
  { key: 'cong_viec', label: 'Công việc', value: '', section: 'Job', placeholder: 'Mô tả công việc' },
  { key: 'cong_viec_cu_the', label: 'Công việc cụ thể', value: '', section: 'Job', placeholder: 'Mô tả chi tiết nhiệm vụ', type: 'textarea' },
  { key: 'hinh_thuc', label: 'Hình thức', value: 'Online', section: 'Job', placeholder: 'Hình thức làm việc' },
  { key: 'yeu_cau', label: 'Yêu cầu', value: '', section: 'Job', placeholder: 'Yêu cầu chi tiết', type: 'textarea' },

  // Financials
  { key: 'so_luong', label: 'SL', value: '1', section: 'Financial', placeholder: 'Số lượng', type: 'number' },
  { key: 'don_gia', label: 'Đơn giá', value: '', section: 'Financial', placeholder: 'Đơn giá' },
  { key: 'thanh_tien', label: 'Thành tiền', value: '', section: 'Financial', placeholder: 'Thành tiền' },
  { key: 'bang_chu_thanh_tien', label: 'Bằng chữ (Thành tiền)', value: '', section: 'Financial', placeholder: 'Số tiền bằng chữ' },
  { key: 'thuc_nhan', label: 'Thực nhận', value: '', section: 'Financial', placeholder: 'Số tiền thực nhận' },
  { key: 'bang_chu_thuc_nhan', label: 'Bằng chữ (Thực nhận)', value: '', section: 'Financial', placeholder: 'Số tiền thực nhận bằng chữ' },
];