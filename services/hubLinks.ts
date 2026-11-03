import { hubLoginUrl, hubRequestAccessUrl } from './workspace-urls';

export const APP_SLUG = 'contract';

/** Gắn vào phần tử hiển thị người dùng đã đăng nhập (kiểm thử e2e của workspace). */
export const WORKSPACE_USER_TEST_ID = 'workspace-user';

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

export function hubUrl(): string {
  const hub = import.meta.env.VITE_HUB_URL as string | undefined;
  if (!hub) throw new Error('Missing environment variable VITE_HUB_URL');
  return trimTrailingSlashes(hub);
}

export function hubLoginHref(returnTo: string = window.location.href): string {
  return hubLoginUrl(hubUrl(), returnTo);
}

export function hubRequestAccessHref(): string {
  return hubRequestAccessUrl(hubUrl(), APP_SLUG);
}

/** Trang quản trị người dùng trên hub (khóa / thu hồi quyền truy cập). */
export function hubAdminUserHref(userId: string): string {
  return `${hubUrl()}/admin/users/${encodeURIComponent(userId)}`;
}

/** Đăng xuất khỏi FES Workspace: form POST tới hub /logout (hub xóa cookie chung). */
export function submitHubLogout(): void {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = `${hubUrl()}/logout`;
  form.style.display = 'none';
  document.body.appendChild(form);
  form.submit();
}
