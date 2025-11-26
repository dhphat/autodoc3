
export interface DocField {
  key: string;
  label: string;
  value: string;
  placeholder?: string;
  section?: 'General' | 'Party A' | 'Party B' | 'Financial' | 'Job' | 'Time' | 'Other';
  type?: 'text' | 'number' | 'select' | 'date';
  options?: { label: string; value: string }[];
  error?: string; // For validation messages
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
  name: string;
  data: Record<string, string>; // Key-value pairs of the fields
  idCardFront?: string | null; // Base64 string or null
  idCardBack?: string | null; // Base64 string or null
  createdAt: number;
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
  { key: 'ho_ten', label: 'Họ tên', value: 'PHẠM HOÀNG ANH', section: 'Party B', placeholder: 'Họ và tên đầy đủ' },
  { key: 'dia_chi', label: 'Địa chỉ', value: 'Tổ 2, Việt Quang, Bắc Giang, Hà Giang', section: 'Party B', placeholder: 'Địa chỉ thường trú/liên hệ' },
  { key: 'dien_thoai', label: 'Điện thoại', value: '0818477217', section: 'Party B', placeholder: 'Số điện thoại' },
  { key: 'email', label: 'Email', value: 'anhphse160124@fpt.edu.vn', section: 'Party B', placeholder: 'Email' },
  { key: 'mst', label: 'MST', value: '8749351746', section: 'Party B', placeholder: 'Mã số thuế cá nhân' },
  { key: 'cccd', label: 'CCCD', value: '002202005211', section: 'Party B', placeholder: 'Số CCCD/CMND' },
  { key: 'ngay_cap', label: 'Ngày cấp', value: '11/04/2023', section: 'Party B', placeholder: 'Ngày cấp CCCD', type: 'date' },
  { key: 'noi_cap', label: 'Nơi cấp', value: 'Cục Cảnh sát Quản lý hành chính về trật tự xã hội', section: 'Party B', placeholder: 'Nơi cấp CCCD' },

  // Payment Info
  { key: 'stk', label: 'STK', value: '0411 5608 601', section: 'Party B', placeholder: 'Số tài khoản ngân hàng' },
  { 
    key: 'ngan_hang', 
    label: 'Ngân hàng', 
    value: 'Ngân hàng TMCP Tiên Phong (TPBank)', 
    section: 'Party B', 
    placeholder: 'Chọn ngân hàng',
    type: 'select',
    options: [] // populated from API
  },
  { key: 'chi_nhanh', label: 'Chi nhánh', value: 'TP.HCM', section: 'Party B', placeholder: 'Chi nhánh ngân hàng' },

  // Job Details
  { key: 'cong_viec', label: 'Công việc', value: 'Dựng video recap, visual, trailer, opening toàn quốc Vòng Bán kết Cuộc thi FPT Edu Color Up 2024', section: 'Job', placeholder: 'Mô tả công việc' },
  { key: 'hinh_thuc', label: 'Hình thức', value: 'Online', section: 'Job', placeholder: 'Hình thức làm việc' },
  { key: 'yeu_cau', label: 'Yêu cầu', value: 'Dựng video recap, visual, trailer, opening toàn quốc Vòng Bán kết Cuộc thi FPT Edu Color Up 2024', section: 'Job', placeholder: 'Yêu cầu chi tiết' },

  // Financials
  { key: 'so_luong', label: 'SL', value: '1', section: 'Financial', placeholder: 'Số lượng', type: 'number' },
  { key: 'don_gia', label: 'Đơn giá', value: '8.666.666', section: 'Financial', placeholder: 'Đơn giá' },
  { key: 'thanh_tien', label: 'Thành tiền', value: '8.666.666', section: 'Financial', placeholder: 'Thành tiền' },
  { key: 'bang_chu_thanh_tien', label: 'Bằng chữ (Thành tiền)', value: 'Tám triệu sáu trăm sáu mươi sáu nghìn sáu trăm sáu mươi sáu đồng', section: 'Financial', placeholder: 'Số tiền bằng chữ' },
  { key: 'thuc_nhan', label: 'Thực nhận', value: '7600000', section: 'Financial', placeholder: 'Số tiền thực nhận' },
  { key: 'bang_chu_thuc_nhan', label: 'Bằng chữ (Thực nhận)', value: 'Bảy triệu sáu trăm nghìn đồng', section: 'Financial', placeholder: 'Số tiền thực nhận bằng chữ' },
];