import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, fromMock, profileQuery, rpcMock } = vi.hoisted(() => {
  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  profileQuery.select.mockReturnValue(profileQuery);
  profileQuery.eq.mockReturnValue(profileQuery);

  return {
    authMock: {
      signUp: vi.fn(),
      getUser: vi.fn(),
    },
    fromMock: vi.fn(() => profileQuery),
    profileQuery,
    rpcMock: vi.fn(),
  };
});

vi.mock('../utils/supabase/client', () => ({
  supabase: {
    auth: authMock,
    from: fromMock,
    rpc: rpcMock,
  },
}));

import { authService } from '../services/supabaseService';

describe('Supabase Auth identity handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileQuery.select.mockReturnValue(profileQuery);
    profileQuery.eq.mockReturnValue(profileQuery);
  });

  it('uses the protected profile role and never reads authorization from user metadata', async () => {
    authMock.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-employee-id',
          email: 'staff@example.test',
          user_metadata: { full_name: 'Staff Member', role: 'PCCM_SUPER_ADMIN' },
        },
      },
    });
    profileQuery.maybeSingle.mockResolvedValue({
      data: { full_name: 'Staff Member', role: 'EMPLOYEE' },
      error: null,
    });

    const currentUser = await authService.getCurrentUser();

    expect(currentUser?.role).toBe('EMPLOYEE');
    expect(profileQuery.select).toHaveBeenCalledWith('full_name, role');
    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'auth-employee-id');
  });

  it('defaults to employee when no protected profile exists, even if metadata claims a privileged role', async () => {
    authMock.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'unlinked-auth-id',
          email: 'new.staff@example.test',
          user_metadata: { role: 'PCCM_SUPER_ADMIN' },
        },
      },
    });
    profileQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

    const currentUser = await authService.getCurrentUser();

    expect(currentUser?.role).toBe('EMPLOYEE');
    expect(currentUser?.fullName).toBe('new.staff');
  });

  it('uses standard Supabase signup and sends no caller-selected role', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: 'new-user' }, session: null },
      error: null,
    });

    await authService.signUp(' New.Staff@Example.Test ', 'long-enough-password', 'New Staff');

    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'new.staff@example.test',
      password: 'long-enough-password',
      options: { data: { full_name: 'New Staff' } },
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
