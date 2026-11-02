import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestLaravelData } = vi.hoisted(() => ({ requestLaravelData: vi.fn() }));

vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return {
    ...actual,
    isLaravelApiConfigured: () => true,
    getLaravelAccessToken: () => null,
    requestLaravelData,
  };
});

vi.mock('../services/supabaseService', () => ({ authService: {} }));

import { AuthProvider, useAuth } from '../context/AuthContext';

function ProfileActions() {
  const { updateProfile } = useAuth();
  const saveContact = async () => updateProfile({ phone: '08001112222', location: 'Lagos' });
  const changeIdentity = async () => {
    try { await updateProfile({ name: 'Unverified Name' }); } catch {}
  };
  return <>
    <button onClick={() => void saveContact()}>Save contact</button>
    <button onClick={() => void changeIdentity()}>Change identity</button>
  </>;
}

describe('authenticated employee profile updates', () => {
  beforeEach(() => requestLaravelData.mockReset());

  it('persists only phone and location through the Laravel API', async () => {
    requestLaravelData.mockResolvedValue({ phone: '08001112222', location: 'Lagos' });
    const { getByRole } = render(<AuthProvider><ProfileActions /></AuthProvider>);
    fireEvent.click(getByRole('button', { name: 'Save contact' }));

    await waitFor(() => expect(requestLaravelData).toHaveBeenCalledWith('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ phone: '08001112222', location: 'Lagos' }),
    }));
  });

  it('does not send unverified identity fields to the API', async () => {
    const { getByRole } = render(<AuthProvider><ProfileActions /></AuthProvider>);
    fireEvent.click(getByRole('button', { name: 'Change identity' }));

    await waitFor(() => expect(requestLaravelData).not.toHaveBeenCalled());
  });
});
