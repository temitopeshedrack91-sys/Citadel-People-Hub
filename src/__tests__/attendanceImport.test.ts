import { describe, expect, it } from 'vitest';
import {
  AttendanceImportService,
  MemoryAttendanceImportStorage,
  StaffIdentity,
  matchDeviceIdToStaff,
  parseBiometricExport,
} from '../features/attendance-import';

const STAFF: StaffIdentity[] = [
  {
    id: 'emp-1',
    staffId: 'CGCC/001',
    fullName: 'Dr. Bukola Adeleke',
    entityName: 'Citadel Global Community Church',
    departmentName: 'People & Culture',
  },
  {
    id: 'emp-4',
    staffId: 'CGCC/004',
    fullName: 'Bayu Wirawan',
    entityName: 'Citadel Global Community Church',
    departmentName: 'Technology & Systems',
  },
];

const createService = () =>
  new AttendanceImportService(new MemoryAttendanceImportStorage());

describe('biometric attendance import', () => {
  it('is idempotent on staff ID + timestamp and accepts overlapping re-uploads', () => {
    const csv = [
      'Staff ID,Timestamp,Punch Direction',
      '0004,2026-09-18 07:48:00,IN',
      '0004,2026-09-18 12:31:00,OUT',
      '0004,2026-09-18 17:06:00,OUT',
      '0001,2026-09-18 08:02:00,IN',
    ].join('\n');

    const service = createService();
    const first = service.importContent(csv, 'september-18.csv', STAFF);

    expect(first.totalRecords).toBe(4);
    expect(first.matchedRecords).toBe(4);
    expect(first.duplicateRecords).toBe(0);

    const firstBayu = first.summaries.find(
      (summary) => summary.employeeStaffId === 'CGCC/004'
    );
    expect(firstBayu).toMatchObject({
      date: '2026-09-18',
      clockInTime: '07:48:00',
      clockOutTime: '17:06:00',
      punchCount: 3,
    });

    const second = service.importContent(csv, 'september-18.csv', STAFF);

    expect(second.duplicateRecords).toBe(4);
    expect(second.storedPunchCount).toBe(4);

    const secondBayu = second.summaries.find(
      (summary) => summary.employeeStaffId === 'CGCC/004'
    );
    expect(secondBayu).toMatchObject({
      clockInTime: '07:48:00',
      clockOutTime: '17:06:00',
      punchCount: 3,
    });

    const overlapping = `${csv}\n0004,2026-09-18 18:12:00,OUT`;
    const third = service.importContent(overlapping, 'september-18-overlap.csv', STAFF);

    expect(third.duplicateRecords).toBe(4);
    expect(third.storedPunchCount).toBe(5);

    const thirdBayu = third.summaries.find(
      (summary) => summary.employeeStaffId === 'CGCC/004'
    );
    expect(thirdBayu).toMatchObject({
      clockInTime: '07:48:00',
      clockOutTime: '18:12:00',
      punchCount: 4,
    });
  });

  it('flags unmatched and ambiguous device IDs instead of dropping them', () => {
    const csv = [
      'Staff ID,Timestamp,Punch Direction',
      '9999,2026-09-18 07:48:00,IN',
      '9999,2026-09-18 17:06:00,OUT',
      'ABC,2026-09-18 08:00:00,IN',
    ].join('\n');

    const service = createService();
    const result = service.importContent(csv, 'unmatched.csv', STAFF);

    expect(result.summaries).toHaveLength(0);
    expect(result.matchedRecords).toBe(0);
    expect(result.unmatchedRecords).toBe(3);
    expect(result.unmatchedDeviceIds).toHaveLength(2);

    const unknownStaff = result.unmatchedDeviceIds.find(
      (record) => record.deviceId === '9999'
    );
    expect(unknownStaff).toMatchObject({
      reason: 'no_staff_record',
      occurrences: 2,
      firstTimestamp: '2026-09-18T07:48:00',
      lastTimestamp: '2026-09-18T17:06:00',
    });

    const invalidFormat = result.unmatchedDeviceIds.find(
      (record) => record.deviceId === 'ABC'
    );
    expect(invalidFormat).toMatchObject({
      reason: 'invalid_device_id_format',
      occurrences: 1,
    });

    const ambiguous = matchDeviceIdToStaff('0001', [
      ...STAFF,
      {
        id: 'emp-ch-1',
        staffId: 'CH/001',
        fullName: 'Chef Kolawole Briggs',
      },
    ]);
    expect(ambiguous.status).toBe('ambiguous');
    if (ambiguous.status === 'ambiguous') {
      expect(ambiguous.candidateStaffIds).toEqual(['CGCC/001', 'CH/001']);
    }
  });

  it('keeps first and last punch on separate rows across a day boundary', () => {
    const csv = [
      'Staff ID,Timestamp,Punch Direction',
      '0004,2026-09-18 23:50:00,IN',
      '0004,2026-09-18 23:58:00,OUT',
      '0004,2026-09-19 00:02:00,IN',
      '0004,2026-09-19 06:00:00,OUT',
    ].join('\n');

    const service = createService();
    const result = service.importContent(csv, 'night-shift.csv', STAFF);

    expect(result.summaries).toHaveLength(2);

    const dayOne = result.summaries.find((summary) => summary.date === '2026-09-18');
    expect(dayOne).toMatchObject({
      clockInTime: '23:50:00',
      clockOutTime: '23:58:00',
      punchCount: 2,
    });

    const dayTwo = result.summaries.find((summary) => summary.date === '2026-09-19');
    expect(dayTwo).toMatchObject({
      clockInTime: '00:02:00',
      clockOutTime: '06:00:00',
      punchCount: 2,
    });
  });

  it('parses optional punch direction and preserves zero-padded IDs', () => {
    const parsed = parseBiometricExport(
      ['User ID,Date/Time', '0004,2026-09-18 07:48:00', '0004,18/09/2026 17:06:00'].join('\n')
    );

    expect(parsed.punches).toHaveLength(2);
    expect(parsed.punches[0]).toMatchObject({
      deviceId: '0004',
      timestamp: '2026-09-18T07:48:00',
      direction: 'unknown',
    });
    expect(parsed.punches[1]).toMatchObject({
      deviceId: '0004',
      timestamp: '2026-09-18T17:06:00',
      direction: 'unknown',
    });

    expect(matchDeviceIdToStaff('0004', STAFF).status).toBe('matched');
    const unpadded = matchDeviceIdToStaff('4', STAFF);
    expect(unpadded.status).toBe('unmatched');
    if (unpadded.status === 'unmatched') {
      expect(unpadded.reason).toBe('invalid_device_id_format');
    }
  });
});
