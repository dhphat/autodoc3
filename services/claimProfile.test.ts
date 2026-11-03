import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';

const { rpc, maybeSingle, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  return {
    rpc: vi.fn(),
    maybeSingle,
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) })),
  };
});

vi.mock('./supabaseClient', () => ({ supabase: { rpc, from } }));

import { UserProvider, useUser } from '../contexts/UserContext';

const user = { id: '11111111-1111-1111-1111-111111111111', email: 'an.nguyen@fpt.edu.vn' } as User;

function profile(overrides: Record<string, unknown>) {
  return {
    id: user.id, email: user.email, full_name: 'An', account_name: 'an.nguyen',
    department_id: null, role: 'user', is_active: false, created_at: '', updated_at: '',
    ...overrides,
  };
}

function Probe() {
  const { userProfile, isAdmin, isLoading } = useUser();
  if (isLoading) return createElement('p', null, 'loading');
  return createElement('p', { 'data-testid': 'probe' }, `${userProfile?.full_name}|${isAdmin}`);
}

function renderProvider() {
  return render(createElement(UserProvider, { user, children: createElement(Probe) }));
}

describe('UserContext + claim_profile', () => {
  beforeEach(() => {
    rpc.mockReset();
    maybeSingle.mockReset();
    from.mockClear();
  });
  afterEach(() => cleanup());

  it('gọi rpc claim_profile đúng một lần và hiện màn hình chờ duyệt khi is_active = false', async () => {
    rpc.mockResolvedValue({ data: profile({ is_active: false }), error: null });

    renderProvider();

    expect(await screen.findByTestId('pending-approval')).toBeTruthy();
    expect(screen.getByText('Tài khoản đang chờ duyệt')).toBeTruthy();
    expect(screen.getByText(user.email!)).toBeTruthy();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('claim_profile');
    // Không còn tự tạo / tìm hồ sơ theo email từ client.
    expect(from).not.toHaveBeenCalled();
    expect(screen.queryByTestId('probe')).toBeNull();
  });

  it('hồ sơ đã kích hoạt -> render app với hồ sơ (kèm phòng ban) và quyền admin', async () => {
    const active = profile({ is_active: true, role: 'admin', department_id: 'd1' });
    rpc.mockResolvedValue({ data: active, error: null });
    maybeSingle.mockResolvedValue({ data: { ...active, department: { id: 'd1', name: 'Phòng A' } }, error: null });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('An|true'));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('user_profiles');
    expect(screen.queryByTestId('pending-approval')).toBeNull();
  });

  it('lỗi khi gọi claim_profile -> màn hình chờ duyệt, không vào app', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProvider();

    expect(await screen.findByTestId('pending-approval')).toBeTruthy();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
