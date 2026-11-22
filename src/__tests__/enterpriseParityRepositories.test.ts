import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestLaravel, requestLaravelData } = vi.hoisted(() => ({
  requestLaravel: vi.fn(),
  requestLaravelData: vi.fn(),
}));

vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return { ...actual, requestLaravel, requestLaravelData };
});

import {
  LaravelClassificationRepository,
  LaravelTimesheetRepository,
  LaravelPerformanceRepository,
  LaravelRecruitmentPipelineRepository,
  LaravelTrainingRepository,
  LaravelReportRepository,
  LaravelClaimRepository,
} from '../services/laravelAdapter';

describe('Enterprise Parity Repositories (OrangeHRM Parity API Integration)', () => {
  beforeEach(() => vi.resetAllMocks());

  describe('LaravelClassificationRepository', () => {
    const repo = new LaravelClassificationRepository();

    it('fetches job titles from /job-titles', async () => {
      const mockTitles = [{ id: 1, title: 'Lead Architect', minExperienceYears: 8, isActive: true }];
      requestLaravelData.mockResolvedValueOnce(mockTitles);

      const result = await repo.getJobTitles();
      expect(requestLaravelData).toHaveBeenCalledWith('/job-titles?activeOnly=true');
      expect(result).toEqual(mockTitles);
    });

    it('posts to /job-titles to create a new job title', async () => {
      const payload = { title: 'Security Analyst', minExperienceYears: 3 };
      requestLaravelData.mockResolvedValueOnce({ id: 2, ...payload, isActive: true });

      const result = await repo.createJobTitle(payload);
      expect(requestLaravelData).toHaveBeenCalledWith('/job-titles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result.id).toBe(2);
    });

    it('fetches pay grades from /pay-grades', async () => {
      const mockGrades = [{ id: 1, name: 'Grade 1', minSalary: 1000, maxSalary: 2000, currency: 'NGN', isActive: true }];
      requestLaravelData.mockResolvedValueOnce(mockGrades);

      const result = await repo.getPayGrades();
      expect(requestLaravelData).toHaveBeenCalledWith('/pay-grades?activeOnly=true');
      expect(result).toEqual(mockGrades);
    });
  });

  describe('LaravelTimesheetRepository', () => {
    const repo = new LaravelTimesheetRepository();

    it('fetches timesheets with filters', async () => {
      requestLaravelData.mockResolvedValueOnce([]);
      await repo.getTimesheets({ employeeId: 42, status: 'SUBMITTED' });
      expect(requestLaravelData).toHaveBeenCalledWith('/timesheets?employeeId=42&status=SUBMITTED');
    });

    it('creates draft timesheet with items', async () => {
      const payload = {
        employeeId: 10,
        periodStart: '2026-11-02',
        periodEnd: '2026-11-08',
        items: [{ activityName: 'Dev', date: '2026-11-03', durationHours: 8 }],
      };
      requestLaravelData.mockResolvedValueOnce({ id: 101, ...payload, status: 'DRAFT', totalHours: 8 });

      const res = await repo.saveDraftTimesheet(payload);
      expect(requestLaravelData).toHaveBeenCalledWith('/timesheets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(res.id).toBe(101);
    });

    it('submits, approves, rejects, and resets timesheet', async () => {
      requestLaravelData.mockResolvedValue({ id: 101, status: 'UPDATED' });

      await repo.submitTimesheet(101);
      expect(requestLaravelData).toHaveBeenCalledWith('/timesheets/101/submit', { method: 'POST' });

      await repo.approveTimesheet(101, 'Approved by lead');
      expect(requestLaravelData).toHaveBeenCalledWith('/timesheets/101/approve', {
        method: 'POST',
        body: JSON.stringify({ comments: 'Approved by lead' }),
      });

      await repo.rejectTimesheet(101, 'Please add missing logs');
      expect(requestLaravelData).toHaveBeenCalledWith('/timesheets/101/reject', {
        method: 'POST',
        body: JSON.stringify({ comments: 'Please add missing logs' }),
      });

      await repo.resetTimesheet(101);
      expect(requestLaravelData).toHaveBeenCalledWith('/timesheets/101/reset', { method: 'POST' });
    });
  });

  describe('LaravelPerformanceRepository', () => {
    const repo = new LaravelPerformanceRepository();

    it('fetches KPIs and evaluates reviews', async () => {
      requestLaravelData.mockResolvedValueOnce([]);
      await repo.getKpis(3);
      expect(requestLaravelData).toHaveBeenCalledWith('/performance/kpis?jobTitleId=3');

      const evalPayload = {
        ratings: [{ kpiTitle: 'Delivery', rating: 4.5 }],
        reviewerComments: 'Great work',
      };
      requestLaravelData.mockResolvedValueOnce({ id: 5, status: 'EVALUATED', finalRating: 4.5 });

      await repo.evaluateReview(5, evalPayload);
      expect(requestLaravelData).toHaveBeenCalledWith('/performance/reviews/5/evaluate', {
        method: 'POST',
        body: JSON.stringify(evalPayload),
      });
    });
  });

  describe('LaravelRecruitmentPipelineRepository', () => {
    const repo = new LaravelRecruitmentPipelineRepository();

    it('manages vacancies and candidate lifecycle', async () => {
      requestLaravelData.mockResolvedValueOnce([]);
      await repo.getVacancies({ activeOnly: true });
      expect(requestLaravelData).toHaveBeenCalledWith('/recruitment/vacancies?activeOnly=true');

      requestLaravelData.mockResolvedValueOnce({ id: 20, status: 'Interview Scheduled' });
      await repo.updateCandidateStatus(20, 'Interview Scheduled', 'Scheduled for round 2');
      expect(requestLaravelData).toHaveBeenCalledWith('/recruitment/candidates/20/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Interview Scheduled', notes: 'Scheduled for round 2' }),
      });

      requestLaravelData.mockResolvedValueOnce({ id: 55, result: 'Passed' });
      await repo.updateInterviewResult(55, 'Passed', 'Candidate excelled');
      expect(requestLaravelData).toHaveBeenCalledWith('/recruitment/interviews/55', {
        method: 'PATCH',
        body: JSON.stringify({ result: 'Passed', notes: 'Candidate excelled' }),
      });
    });
  });

  describe('LaravelTrainingRepository & ReportRepository', () => {
    it('calls training course and session endpoints', async () => {
      const trainRepo = new LaravelTrainingRepository();
      requestLaravelData.mockResolvedValueOnce([]);
      await trainRepo.getCourses();
      expect(requestLaravelData).toHaveBeenCalledWith('/training/courses?activeOnly=true');

      requestLaravelData.mockResolvedValueOnce({ id: 9, status: 'Enrolled' });
      await trainRepo.enrollEmployee(2, 50);
      expect(requestLaravelData).toHaveBeenCalledWith('/training/sessions/2/enroll', {
        method: 'POST',
        body: JSON.stringify({ employeeId: 50 }),
      });
    });

    it('fetches enterprise reporting summaries', async () => {
      const reportRepo = new LaravelReportRepository();
      requestLaravelData.mockResolvedValue({ totalEmployees: 100 });

      await reportRepo.getWorkforceReport();
      expect(requestLaravelData).toHaveBeenCalledWith('/reports/workforce');

      await reportRepo.getLeaveReport(2026);
      expect(requestLaravelData).toHaveBeenCalledWith('/reports/leave-utilization?year=2026');

      await reportRepo.getAttendanceReport({ startDate: '2026-11-01', endDate: '2026-11-07' });
      expect(requestLaravelData).toHaveBeenCalledWith('/reports/attendance-summary?startDate=2026-11-01&endDate=2026-11-07');

      await reportRepo.getRecruitmentReport();
      expect(requestLaravelData).toHaveBeenCalledWith('/reports/recruitment-summary');
    });
  });

  describe('LaravelClaimRepository (OrangeHRM Claim Plugin Parity)', () => {
    const repo = new LaravelClaimRepository();

    it('fetches claim events and expense types', async () => {
      requestLaravelData.mockResolvedValueOnce([{ id: 1, name: 'Local Travel' }]);
      const events = await repo.getEvents();
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/events?activeOnly=true');
      expect(events).toHaveLength(1);

      requestLaravelData.mockResolvedValueOnce([{ id: 2, name: 'Hotel Lodging' }]);
      const types = await repo.getExpenseTypes();
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/expense-types?activeOnly=true');
      expect(types).toHaveLength(1);
    });

    it('creates events and expense types with POST requests', async () => {
      requestLaravelData.mockResolvedValueOnce({ id: 5, name: 'Regional Summit' });
      await repo.createEvent({ name: 'Regional Summit', code: 'SUMMIT' });
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/events', {
        method: 'POST',
        body: JSON.stringify({ name: 'Regional Summit', code: 'SUMMIT' }),
      });

      requestLaravelData.mockResolvedValueOnce({ id: 8, name: 'Fuel Allowance' });
      await repo.createExpenseType({ name: 'Fuel Allowance', code: 'EXP-FUEL' });
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/expense-types', {
        method: 'POST',
        body: JSON.stringify({ name: 'Fuel Allowance', code: 'EXP-FUEL' }),
      });
    });

    it('handles claim lifecycle operations: get, create, expense manipulation, and state actions', async () => {
      // 1. Get claims with filter params
      requestLaravelData.mockResolvedValueOnce([]);
      await repo.getClaims({ status: 'SUBMITTED', employeeId: 42 });
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/requests?status=SUBMITTED&employee_id=42');

      // 2. Create claim
      const newClaimPayload = {
        employeeId: 42,
        claimEventId: 1,
        currency: 'NGN',
        description: 'Client visit expenses',
      };
      requestLaravelData.mockResolvedValueOnce({ id: 101, claimNumber: 'CLM-2026-0001' });
      const created = await repo.createClaim(newClaimPayload);
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/requests', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: 42,
          claim_event_id: 1,
          currency: 'NGN',
          description: 'Client visit expenses',
          remarks: undefined,
          status: undefined,
          expenses: undefined,
        }),
      });
      expect(created.id).toBe(101);

      // 3. Add expense line item
      requestLaravelData.mockResolvedValueOnce({ id: 101, totalAmount: 15000 });
      await repo.addExpenseItem(101, {
        expenseTypeId: 2,
        expenseDate: '2026-11-20',
        amount: 15000,
        note: 'Taxi fare',
      });
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/requests/101/expenses', {
        method: 'POST',
        body: JSON.stringify({
          expense_type_id: 2,
          expense_date: '2026-11-20',
          amount: 15000,
          currency: undefined,
          note: 'Taxi fare',
          receipt_url: undefined,
        }),
      });

      // 4. Delete expense line item
      requestLaravelData.mockResolvedValueOnce({ id: 101, totalAmount: 0 });
      await repo.deleteExpenseItem(555);
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/expenses/555', {
        method: 'DELETE',
      });

      // 5. Perform approval action
      requestLaravelData.mockResolvedValueOnce({ id: 101, status: 'APPROVED' });
      await repo.performAction(101, 'APPROVE');
      expect(requestLaravelData).toHaveBeenCalledWith('/claims/requests/101/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'APPROVE', reason: undefined }),
      });
    });
  });
});
