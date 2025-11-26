export const validateField = (key: string, value: string): string | undefined => {
  if (!value) return undefined;
  
  // Phone: VN Regex (approximate)
  // Accepts formats starting with 84 or 0, followed by valid mobile prefixes and length
  if (key === 'dien_thoai') {
      const phoneRegex = /^(0|84)(3|5|7|8|9)([0-9]{8})$/;
      // Remove spaces/dots for validation
      const cleanValue = value.replace(/[\s\.]/g, '');
      if (!phoneRegex.test(cleanValue)) return 'Số điện thoại không hợp lệ (VN)';
  }
  
  // CCCD: 12 digits
  if (key === 'cccd') {
      const cleanValue = value.replace(/\s/g, '');
      if (!/^\d{12}$/.test(cleanValue)) return 'CCCD phải gồm 12 chữ số';
  }

  // Day: 1-31
  if (['ngay_bat_dau', 'ngay_ket_thuc'].includes(key)) {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 31) return 'Ngày từ 1 đến 31';
  }

  // Month: 1-12
  if (['thang_bat_dau', 'thang_ket_thuc'].includes(key)) {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 12) return 'Tháng từ 1 đến 12';
  }

  return undefined;
};