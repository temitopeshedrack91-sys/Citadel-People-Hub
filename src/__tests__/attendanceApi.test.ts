import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestLaravelData } = vi.hoisted(() => ({ requestLaravelData: vi.fn() }));

vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return { ...actual, requestLaravelData };
});

import { LaravelAttendanceRepository } from '../services/laravelAdapter';
import { Employee } from '../types';

describe('Laravel biometric attendance API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads persisted punches through pagination and uses the existing matcher for summaries', async () => {
    requestLaravelData.mockResolvedValueOnce({
      punches: [{
        deviceId: '0014',
        timestamp: '2026-10-29T08:01:02',
        date: '2026-10-29',
        time: '08:01:02',
        direction: 'in',
        rawDirection: 'Check In',
        sourceLine: 2,
      }],
      pagination: { currentPage: 1, lastPage: 2 },
      punchCount: 2,
      lastFileName: 'october.csv',
      lastImportedAt: '2026-10-30T14:00:00.000Z',
    }).mockResolvedValueOnce({
      punches: [{
        deviceId: '0014',
        timestamp: '2026-10-29T17:02:05',
        date: '2026-10-29',
        time: '17:02:05',
        direction: 'out',
        rawDirection: 'Check Out',
        sourceLine: 3,
      }],
      pagination: { currentPage: 2, lastPage: 2 },
      punchCount: 2,
      lastFileName: 'october.csv',
      lastImportedAt: '2026-10-30T14:00:00.000Z',
    });

    const employee = {
      id: '14', staffId: 'CGCC/014', fullName: 'Test Employee', firstName: 'Test', lastName: 'Employee',
      entityId: 'entity-cgcc', entityName: 'Citadel', departmentId: '1', departmentName: 'People',
      jobTitle: 'Officer', gradeLevel: '1', employmentType: 'Full-Time', employmentDate: '2020-01-01',
      contractStatus: 'Permanent', yearsOfService: 6, qualifications: [], certifications: [],
      bankPayroll: { bankName: '', accountNumber: '', accountName: '', salaryGrade: '', currency: 'NGN' },
      pensionHmo: { pfaName: '', rsaPin: '', hmoProvider: '', hmoPlan: '', hmoIdNumber: '' },
      status: 'Active',
    } as unknown as Employee;

    const snapshot = await new LaravelAttendanceRepository().getBiometricPunchSnapshot([employee]);

    expect(requestLaravelData).toHaveBeenNthCalledWith(1, '/attendance/biometric-punches?per_page=1000&page=1');
    expect(requestLaravelData).toHaveBeenNthCalledWith(2, '/attendance/biometric-punches?per_page=1000&page=2');
    expect(snapshot.punchCount).toBe(2);
    expect(snapshot.summaries).toHaveLength(1);
    expect(snapshot.summaries[0]).toMatchObject({
      employeeId: '14', employeeStaffId: 'CGCC/014', date: '2026-10-29',
      clockInTime: '08:01:02', clockOutTime: '17:02:05', punchCount: 2,
    });
  });

  it('posts raw punch facts to the authenticated API and propagates API failures', async () => {
    const repository = new LaravelAttendanceRepository();
    const punches = [{ deviceId: '0014', timestamp: '2026-10-29T08:01:02', date: '2026-10-29', time: '08:01:02', direction: 'in' as const }];
    requestLaravelData.mockResolvedValueOnce({
      totalRecords: 1, matchedRecords: 1, unmatchedRecords: 0, duplicateRecords: 0,
      storedPunchCount: 1, unmatchedDeviceIds: [], importedAt: '2026-10-30T14:00:00.000Z', fileName: 'october.csv',
    });

    const result = await repository.importBiometricPunches('october.csv', punches);
    expect(requestLaravelData).toHaveBeenCalledWith('/attendance/biometric-imports', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'october.csv', punches }),
    });
    expect(result.matchedRecords).toBe(1);

    requestLaravelData.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(repository.importBiometricPunches('october.csv', punches)).rejects.toThrow('Forbidden');
  });
});
