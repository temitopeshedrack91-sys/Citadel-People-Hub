import { describe, expect, it } from 'vitest';
import { canUseLocalPersonaAuthentication, canUseSupabaseDirectAccess, shouldUseLaravelBackend } from '../utils/authMode';

describe('local persona authentication', () => {
  it('is available in development when no authenticated backend is configured', () => {
    expect(canUseLocalPersonaAuthentication(true, false, true)).toBe(true);
  });

  it('is unavailable in production builds', () => {
    expect(canUseLocalPersonaAuthentication(false, false, true)).toBe(false);
  });

  it('is unavailable when Laravel is configured, including local development', () => {
    expect(canUseLocalPersonaAuthentication(true, true, true)).toBe(false);
    expect(canUseLocalPersonaAuthentication(false, true, true)).toBe(false);
  });

  it('requires an explicit demo-mode opt-in', () => {
    expect(canUseLocalPersonaAuthentication(true, false, false)).toBe(false);
  });
});

describe('production data plane selection', () => {
  it('requires Laravel for production even when its URL is misconfigured', () => {
    expect(shouldUseLaravelBackend(true, false)).toBe(true);
  });

  it('uses Laravel whenever the API is configured', () => {
    expect(shouldUseLaravelBackend(false, true)).toBe(true);
  });

  it('keeps local Supabase/demo mode in development without an API', () => {
    expect(shouldUseLaravelBackend(false, false)).toBe(false);
  });
});

describe('direct Supabase access', () => {
  it('is disabled unless explicitly enabled in a development build without Laravel', () => {
    expect(canUseSupabaseDirectAccess(true, false, true)).toBe(true);
    expect(canUseSupabaseDirectAccess(true, false, false)).toBe(false);
    expect(canUseSupabaseDirectAccess(true, true, true)).toBe(false);
    expect(canUseSupabaseDirectAccess(false, false, true)).toBe(false);
  });
});
