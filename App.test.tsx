import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { ensureAppAccess, getUser, onAuthStateChange, supabase } = vi.hoisted(() => {
  const getUser = vi.fn();
  const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } }));
  return { ensureAppAccess: vi.fn(), getUser, onAuthStateChange, supabase: { auth: { getUser, onAuthStateChange } } };
});

vi.mock('./services/workspace-auth', () => ({ ensureAppAccess }));
vi.mock('./services/supabaseClient', () => ({ supabase, createGuestClient: vi.fn() }));
vi.mock('./components/GuestFormPage', () => ({ default: () => <p data-testid="guest-form">form khách</p> }));
vi.mock('./contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUser: () => ({ userProfile: null, isAdmin: false, departmentId: null, isLoading: true }),
}));

import App from './App';

describe('App: cổng FES Workspace', () => {
  beforeEach(() => {
    ensureAppAccess.mockReset();
    getUser.mockReset();
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('/form là trang công khai: không gọi ensureAppAccess, không đọc phiên', () => {
    window.history.replaceState(null, '', '/form?dept=abc');

    render(<App />);

    expect(screen.getByTestId('guest-form')).toBeTruthy();
    expect(ensureAppAccess).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(onAuthStateChange).not.toHaveBeenCalled();
  });

  it('các trang khác gọi ensureAppAccess(supabase, "contract") trước khi render app', async () => {
    ensureAppAccess.mockReturnValue(new Promise(() => {})); // đang chuyển sang hub

    render(<App />);

    expect(ensureAppAccess).toHaveBeenCalledWith(supabase, 'contract');
    expect(screen.queryByTestId('guest-form')).toBeNull();
    expect(screen.queryByTestId('workspace-user')).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('kiểm tra quyền lỗi -> trang đăng nhập với liên kết tới hub', async () => {
    ensureAppAccess.mockRejectedValue(new Error('can_access failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    const link = await screen.findByText('Đăng nhập qua FES Workspace');
    expect(link.closest('a')?.getAttribute('href')).toMatch(/^https:\/\/hub\.fptsx\.space\/login\?next=/);
    expect(screen.getByText(/Không kiểm tra được quyền truy cập FES Contract/)).toBeTruthy();
  });
});
