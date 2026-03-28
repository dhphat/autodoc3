export const validateField = (key: string, value: string): string | undefined => {
  if (!value) return undefined;

  // Email
  if (key === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) return 'Email không hợp lệ';
  }

  // Phone: 10 digits, starts with 0
  if (key === 'dien_thoai') {
    const clean = value.replace(/[\s\.]/g, '');
    if (!/^0\d{9}$/.test(clean)) return 'SĐT gồm 10 số, bắt đầu bằng 0';
  }

  // MST: digits only
  if (key === 'mst') {
    const clean = value.replace(/[\s\-]/g, '');
    if (!/^\d+$/.test(clean)) return 'MST chỉ gồm chữ số';
  }

  // CCCD: 12 digits
  if (key === 'cccd') {
    const clean = value.replace(/\s/g, '');
    if (!/^\d{12}$/.test(clean)) return 'CCCD phải gồm 12 chữ số';
  }

  // STK: digits only
  if (key === 'stk') {
    const clean = value.replace(/[\s\-]/g, '');
    if (!/^\d+$/.test(clean)) return 'STK chỉ gồm chữ số';
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