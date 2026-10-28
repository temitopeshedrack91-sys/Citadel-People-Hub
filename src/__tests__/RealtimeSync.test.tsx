import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { realtimeSync, RealtimeTable } from '../services/realtimeSync';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import {
  requestLaravel,
  requestLaravelData,
  setLaravelAccessToken,
  getLaravelAccessToken,
  LaravelApiError,
} from '../services/laravelClient';
import {
  LaravelEmployeeRepository,
  LaravelLeaveRepository,
  LaravelAttendanceRepository,
} from '../services/laravelAdapter';

// Mock Supabase client
const mockRemoveChannel = vi.fn();
const mockChannelInstances = new Map<string, any>();

vi.mock('../utils/supabase/client', () => {
  return {
    supabase: {
      channel: vi.fn((channelName: string) => {
        let callbackHandler: ((payload: any) => void) | null = null;
        let statusCallback: ((status: string) => void) | null = null;

        const mockChannel = {
          name: channelName,
          on: vi.fn((_type: string, _filter: any, cb: any) => {
            callbackHandler = cb;
            return mockChannel;
          }),
          subscribe: vi.fn((subCb: any) => {
            statusCallback = subCb;
            if (subCb) subCb('SUBSCRIBED');
            return mockChannel;
          }),
          // Helper for tests to trigger incoming websocket postgres_changes
          __simulateChange: (payload: any) => {
            if (callbackHandler) callbackHandler(payload);
          },
          __simulateStatus: (status: string) => {
            if (statusCallback) statusCallback(status);
          },
        };

        mockChannelInstances.set(channelName, mockChannel);
        return mockChannel;
      }),
      removeChannel: vi.fn((channel: any) => {
        mockRemoveChannel(channel);
        mockChannelInstances.delete(channel.name);
      }),
    },
  };
});

describe('Citadel Realtime Synchronization & Layer Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelInstances.clear();
    setLaravelAccessToken('test-sanctum-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setLaravelAccessToken(null);
  });

  describe('1. Realtime WebSocket Subscription & Cleanup', () => {
    it('deduplicates channels when multiple subscribers listen to the same table', () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      const unsubA = realtimeSync.subscribe('employees', listenerA);
      const unsubB = realtimeSync.subscribe('employees', listenerB);

      // Only 1 channel should be registered in Supabase for 'employees'
      const active = realtimeSync.getActiveSubscriptions();
      expect(active['realtime:employees']).toBeDefined();
      expect(active['realtime:employees'].subscribers).toBe(2);

      // Simulate an incoming INSERT payload from Supabase WAL
      const channel = mockChannelInstances.get('realtime:employees');
      expect(channel).toBeDefined();

      const mockPayload = {
        eventType: 'INSERT',
        new: { id: 10, full_name: 'David Adeleke', staff_id: 'CGCC-010' },
        old: null,
      };

      channel.__simulateChange(mockPayload);

      expect(listenerA).toHaveBeenCalledWith(mockPayload);
      expect(listenerB).toHaveBeenCalledWith(mockPayload);

      // Cleanup listenerA -> 1 subscriber remains, channel not removed
      unsubA();
      expect(realtimeSync.getActiveSubscriptions()['realtime:employees'].subscribers).toBe(1);
      expect(mockRemoveChannel).not.toHaveBeenCalled();

      // Cleanup listenerB -> 0 subscribers remain, channel safely removed to prevent leaks
      unsubB();
      expect(realtimeSync.getActiveSubscriptions()['realtime:employees']).toBeUndefined();
      expect(mockRemoveChannel).toHaveBeenCalledWith(channel);
    });

    it('useRealtimeTable hook cleans up on component unmount', () => {
      const onUpdate = vi.fn();

      const { unmount } = renderHook(() =>
        useRealtimeTable('leave_requests', onUpdate)
      );

      const channel = mockChannelInstances.get('realtime:leave_requests');
      expect(channel).toBeDefined();

      // Simulate a leave approval event arriving without page reload
      const approvalEvent = {
        eventType: 'UPDATE',
        new: { id: 5, status: 'Approved', approval_stage: 'HR' },
        old: { id: 5, status: 'Pending Review' },
      };

      act(() => {
        channel.__simulateChange(approvalEvent);
      });

      expect(onUpdate).toHaveBeenCalledWith(approvalEvent);

      // Unmounting hook must trigger channel teardown
      unmount();
      expect(mockRemoveChannel).toHaveBeenCalledWith(channel);
      expect(realtimeSync.getActiveSubscriptions()['realtime:leave_requests']).toBeUndefined();
    });
  });

  describe('2. Frontend -> Laravel -> Supabase Round-Trip Action', () => {
    it('persists employee creation with authorization token through Laravel client', async () => {
      const mockCreatedEmployee = {
        id: '15',
        staffId: 'CGCC-015',
        fullName: 'Kehinde Balogun',
        firstName: 'Kehinde',
        lastName: 'Balogun',
        email: 'kehinde@citadel.ng',
        jobTitle: 'Senior Systems Architect',
        status: 'Active',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: mockCreatedEmployee }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const repo = new LaravelEmployeeRepository();
      const result = await repo.create({
        staffId: 'CGCC-015',
        fullName: 'Kehinde Balogun',
        firstName: 'Kehinde',
        lastName: 'Balogun',
        email: 'kehinde@citadel.ng',
        jobTitle: 'Senior Systems Architect',
        status: 'Active',
      } as any);

      expect(result.staffId).toBe('CGCC-015');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, requestInit] = fetchMock.mock.calls[0];
      expect(url).toContain('/api/v1/employees');
      expect(requestInit.method).toBe('POST');
      expect(requestInit.headers.get('Authorization')).toBe('Bearer test-sanctum-token');
      expect(requestInit.headers.get('Content-Type')).toBe('application/json');
    });

    it('submits leave request through Laravel leave repository with boundary validation', async () => {
      const mockLeaveResponse = {
        id: '22',
        employeeId: '2',
        employeeStaffId: 'CGCC-001',
        employeeName: 'Dr. Bukola Adeleke',
        entityName: 'Citadel Global Community Church',
        departmentName: 'People & Culture',
        leaveType: 'Annual Leave',
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        totalDays: 5,
        reason: 'Rest and retreat',
        status: 'Submitted',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: mockLeaveResponse }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const repo = new LaravelLeaveRepository();
      const leave = await repo.submitRequest({
        employeeId: '2',
        employeeStaffId: 'CGCC-001',
        employeeName: 'Dr. Bukola Adeleke',
        entityName: 'Citadel Global Community Church',
        departmentName: 'People & Culture',
        leaveType: 'Annual Leave' as any,
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        totalDays: 5,
        reason: 'Rest and retreat',
      });

      expect(leave.id).toBe('22');
      expect(leave.status).toBe('Submitted');
    });

    it('records attendance clock-in through Laravel attendance repository', async () => {
      const mockAttendance = {
        id: '88',
        employeeId: '2',
        employeeName: 'Dr. Bukola Adeleke',
        staffId: 'CGCC-001',
        status: 'Present',
        clockInTime: '2026-10-28T08:00:00Z',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: mockAttendance }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const repo = new LaravelAttendanceRepository();
      const att = await repo.recordClockIn(
        '2',
        'Dr. Bukola Adeleke',
        'CGCC-001',
        'Citadel Global Community Church',
        'People & Culture'
      );

      expect(att.status).toBe('Present');
      expect(att.employeeName).toBe('Dr. Bukola Adeleke');
    });
  });

  describe('3. Error Boundaries, Token Expiry, and Retries', () => {
    it('dispatches citadel:unauthorized and wipes token when Laravel returns 401', async () => {
      const unauthorizedHandler = vi.fn();
      window.addEventListener('citadel:unauthorized', unauthorizedHandler);

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthenticated.' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(requestLaravel('/auth/user')).rejects.toThrow(LaravelApiError);

      expect(getLaravelAccessToken()).toBeNull();
      expect(unauthorizedHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener('citadel:unauthorized', unauthorizedHandler);
    });

    it('formats boundary validation errors into readable messages on 422 Unprocessable', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'The given data was invalid.',
          errors: {
            staffId: ['The staff id has already been taken.'],
            email: ['The email must be a valid email address.'],
          },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      try {
        await requestLaravel('/employees', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        expect.unreachable('Should have thrown LaravelApiError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LaravelApiError);
        expect(err.status).toBe(422);
        expect(err.message).toContain('The staff id has already been taken.');
        expect(err.message).toContain('The email must be a valid email address.');
      }
    });

    it('retries transient network drops before succeeding', async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new TypeError('Failed to fetch (network drop)');
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { ping: 'pong' } }),
        };
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await requestLaravelData<{ ping: string }>('/health');
      expect(result.ping).toBe('pong');
      expect(callCount).toBe(2);
    });
  });
});

