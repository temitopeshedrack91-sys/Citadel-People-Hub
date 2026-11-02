import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

const { authSignOut, requestLaravel, setLaravelAccessToken } = vi.hoisted(() => ({
  authSignOut: vi.fn(),
  requestLaravel: vi.fn(),
  setLaravelAccessToken: vi.fn(),
}));

vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return {
    ...actual,
    isLaravelApiConfigured: () => true,
    getLaravelAccessToken: () => null,
    requestLaravel,
    setLaravelAccessToken,
  };
});

vi.mock('../services/supabaseService', () => ({
  authService: { signOut: authSignOut },
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

function LogoutButton() {
  const { logout, backendEnabled } = useAuth();
  return <button onClick={() => void logout()} data-testid="logout" data-backend={String(backendEnabled)}>Sign out</button>;
}

describe('authentication provider logout', () => {
  it('revokes only the Laravel session when Laravel is the canonical provider', async () => {
    requestLaravel.mockResolvedValue(undefined);
    render(<AuthProvider><LogoutButton /></AuthProvider>);

    expect(document.querySelector('[data-testid="logout"]')).toHaveAttribute('data-backend', 'true');
    fireEvent.click(document.querySelector('[data-testid="logout"]')!);

    await waitFor(() => expect(requestLaravel).toHaveBeenCalledWith('/auth/logout', { method: 'POST' }));
    expect(setLaravelAccessToken).toHaveBeenCalledWith(null);
    expect(authSignOut).not.toHaveBeenCalled();
  });
});
