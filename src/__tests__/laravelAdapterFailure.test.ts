import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestLaravel, requestLaravelData } = vi.hoisted(() => ({
  requestLaravel: vi.fn(),
  requestLaravelData: vi.fn(),
}));

vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return { ...actual, requestLaravel, requestLaravelData };
});

import { LaravelEmployeeRepository, LaravelPayrollRepository, LaravelTalentRepository } from '../services/laravelAdapter';

describe('Laravel repositories preserve API failure and empty-state semantics', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns an actual empty employee list instead of demo employees', async () => {
    requestLaravelData.mockResolvedValueOnce([]);

    await expect(new LaravelEmployeeRepository().getAll()).resolves.toEqual([]);
  });

  it('propagates employee API failures', async () => {
    const error = new Error('Employee API unavailable');
    requestLaravelData.mockRejectedValueOnce(error);

    await expect(new LaravelEmployeeRepository().getAll()).rejects.toBe(error);
  });

  it('does not report successful payroll writes when the API rejects them', async () => {
    const error = new Error('Payroll API unavailable');
    requestLaravelData.mockRejectedValueOnce(error);

    await expect(new LaravelPayrollRepository().generatePayrollRun({
      period_start: '2026-11-01',
      period_end: '2026-11-30',
    })).rejects.toBe(error);
  });

  it('does not replace failed onboarding reads with seeded journeys', async () => {
    const error = new Error('Talent API unavailable');
    requestLaravelData.mockRejectedValueOnce(error);

    await expect(new LaravelTalentRepository().getOnboardingJourneys()).rejects.toBe(error);
  });

  it('does not return a journey when task persistence fails', async () => {
    const error = new Error('Onboarding task route unavailable');
    requestLaravelData.mockRejectedValueOnce(error);

    await expect(new LaravelTalentRepository().createOnboardingTask('journey-1', {
      title: 'Submit access request',
      description: 'Request required account access.',
      department: 'IT',
      timeline: 'Day 1',
      assignedRole: 'ICT',
      dueDate: '2026-11-01',
    })).rejects.toBe(error);
  });
});
