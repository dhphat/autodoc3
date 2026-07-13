export const slugify = (text: string) => {
  return text.toString().toLowerCase()
    .normalize('NFD') // Tách dấu ra khỏi chữ cái
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, '') // Xóa ký tự đặc biệt
    .trim()
    .replace(/\s+/g, '-'); // Thay khoảng trắng bằng dấu gạch ngang
}

export const uuidToShortCode = (uuid: string): string => {
  if (!uuid) return '';
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash << 5) - hash + uuid.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let short = '';
  for (let i = 0; i < 3; i++) {
    short += chars[hash % 62];
    hash = Math.floor(hash / 62);
  }
  return short;
};
