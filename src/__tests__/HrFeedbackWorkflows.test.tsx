import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockLeaveRepository,
  MockOffboardingRepository,
  MockPerformanceRepository,
  MockEmployeeRepository,
} from '../services/mockRepository';

describe('HR Feedback End-to-End Workflows (Local Persistence & Cross-End Sync)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('completes Employee -> Selected Manager -> HR Final Approval leave flow and updates balances dynamically', async () => {
    const empRepo = new MockEmployeeRepository();
    const employeeLeaveRepo = new MockLeaveRepository();
    const managerLeaveRepo = new MockLeaveRepository();
    const hrLeaveRepo = new MockLeaveRepository();

    const employees = await empRepo.getAll();
    const employee = employees.find((e) => e.id === 'emp-3') || employees[0];
    const selectedManager = employees.find((e) => e.id === 'emp-0') || employees[1];

    const initialBalances = await employeeLeaveRepo.getBalances(employee.id);
    const annualBefore = initialBalances.find((b) => b.category?.name === 'Annual Leave');
    expect(annualBefore).toBeDefined();

    // 1. Employee submits leave selecting their reviewing manager
    const created = await employeeLeaveRepo.submitRequest({
      employeeId: employee.id,
      employeeStaffId: employee.staffId,
      employeeName: employee.fullName,
      departmentName: employee.departmentName,
      entityName: employee.entityName,
      managerId: selectedManager.id,
      managerName: selectedManager.fullName,
      leaveType: 'Annual Leave',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      totalDays: 3,
      reason: 'Year-end family retreat',
      approvalStage: 'MANAGER',
    });

    expect(created.managerId).toBe(selectedManager.id);
    expect(created.approvalStage).toBe('MANAGER');

    // 2. Manager instance sees the newly submitted leave immediately (cross-end reflection)
    const managerView = await managerLeaveRepo.getAll();
    const foundByManager = managerView.find((r) => r.id === created.id);
    expect(foundByManager).toBeDefined();
    expect(foundByManager?.managerId).toBe(selectedManager.id);

    // Pending days updated in employee balance
    const pendingBalances = await employeeLeaveRepo.getBalances(employee.id);
    const annualPending = pendingBalances.find((b) => b.category?.name === 'Annual Leave');
    expect(Number(annualPending?.pending_days || 0)).toBe(Number(annualBefore?.pending_days || 0) + 3);

    // 3. Manager approves Stage 1 -> advances to HR Stage 2
    const afterManager = await managerLeaveRepo.updateStatus(
      created.id,
      'Approved',
      selectedManager.fullName,
      'Handover coverage confirmed.'
    );
    expect(afterManager.approvalStage).toBe('HR');
    expect(afterManager.status).toBe('Pending Review');

    // 4. HR sees Stage 2 request and grants final approval
    const hrView = await hrLeaveRepo.getAll();
    expect(hrView.find((r) => r.id === created.id)?.approvalStage).toBe('HR');

    const afterHr = await hrLeaveRepo.updateStatus(
      created.id,
      'Approved',
      'Dr. Bukola Adeleke',
      'Final HR approval granted.'
    );
    expect(afterHr.approvalStage).toBe('COMPLETE');
    expect(afterHr.status).toBe('Approved');

    // 5. Employee sees Approved status and updated remaining balance
    const finalBalances = await employeeLeaveRepo.getBalances(employee.id);
    const annualAfter = finalBalances.find((b) => b.category?.name === 'Annual Leave');
    expect(Number(annualAfter?.used_days || 0)).toBe(Number(annualBefore?.used_days || 0) + 3);
    expect(Number(annualAfter?.remaining_days || 0)).toBe(Number(annualBefore?.remaining_days || 0) - 3);
  });

  it('supports HR KPI creation linked to job role, Manager appraisal scoring with comments, and profile persistence', async () => {
    const hrPerfRepo = new MockPerformanceRepository();
    const managerPerfRepo = new MockPerformanceRepository();
    const employeeProfileRepo = new MockPerformanceRepository();

    // 1. HR creates a job-description-linked KPI
    const kpi1 = await hrPerfRepo.createKpi({
      indicator: 'Infrastructure Uptime SLA',
      minRating: 1,
      maxRating: 5,
      weight: 60,
      jobTitleId: 2,
      jobTitleName: 'Media & ICT Engineer',
      isActive: true,
    });
    const kpi2 = await hrPerfRepo.createKpi({
      indicator: 'Cross-Team Technical Collaboration',
      minRating: 1,
      maxRating: 5,
      weight: 40,
      jobTitleId: 2,
      jobTitleName: 'Media & ICT Engineer',
      isActive: true,
    });
    expect(kpi1.jobTitleId).toBe(2);

    // 2. Manager initiates appraisal for direct report ('emp-3')
    const review = await managerPerfRepo.createReview({
      employeeId: 'emp-3' as any,
      reviewerId: 'emp-0' as any,
      reviewPeriodStart: '2026-01-01',
      reviewPeriodEnd: '2026-12-31',
      dueDate: '2026-12-20',
      kpis: [
        { kpiId: kpi1.id, title: kpi1.indicator, weight: 60 },
        { kpiId: kpi2.id, title: kpi2.indicator, weight: 40 },
      ],
    });

    // 3. Manager scores KPIs with justification comments (inheriting review weights)
    const evaluated = await managerPerfRepo.evaluateReview(review.id, {
      ratings: [
        { kpiId: kpi1.id, kpiTitle: kpi1.indicator, rating: 5, comment: 'Zero unplanned downtime during major services.' },
        { kpiId: kpi2.id, kpiTitle: kpi2.indicator, rating: 4, comment: 'Strong cross-team mentoring.' },
      ],
      reviewerComments: 'Outstanding annual technical delivery.',
    });

    // Weighted average: (5 * 60 + 4 * 40) / 100 = 4.6
    expect(evaluated.status).toBe('EVALUATED');
    expect(evaluated.finalRating).toBeCloseTo(4.6, 2);

    const approved = await managerPerfRepo.approveReview(review.id, evaluated.version);
    expect(approved.status).toBe('APPROVED');

    // 4. Employee profile & dashboard read back the persisted appraisal by string ID
    const profileReviews = await employeeProfileRepo.getReviews({ employeeId: 'emp-3' });
    const saved = profileReviews.find((r) => r.id === review.id);
    expect(saved).toBeDefined();
    expect(saved?.finalRating).toBeCloseTo(4.6, 2);
    expect(saved?.reviewerComments).toBe('Outstanding annual technical delivery.');
  });

  it('completes Employee Resignation -> Manager Forward -> HR Notice Check -> Exit Interview visible to Employee', async () => {
    const empOffboardRepo = new MockOffboardingRepository();
    const mgrOffboardRepo = new MockOffboardingRepository();
    const hrOffboardRepo = new MockOffboardingRepository();

    // 1. Employee submits resignation selecting manager
    const created = await empOffboardRepo.create({
      employeeId: 'emp-3',
      managerId: 'emp-0',
      resignationDate: '2026-11-26',
      proposedLastDay: '2026-12-31',
      reason: 'Relocating abroad for postgraduate fellowship.',
    });
    expect(created.status).toBe('SUBMITTED');
    expect(created.noticeCompliant).toBe(true);

    // 2. Manager endorses and forwards resignation to HR
    const endorsed = await mgrOffboardRepo.endorseByManager(created.id, {
      comments: 'Knowledge transfer checklist agreed with ICT lead.',
    });
    expect(endorsed.managerEndorsed).toBe(true);
    expect(endorsed.status).toBe('MANAGER_REVIEWED');

    // 3. HR verifies contract & notice period
    const verified = await hrOffboardRepo.verifyNotice(created.id, { noticeCompliant: true });
    expect(verified.hrVerified).toBe(true);
    expect(verified.status).toBe('NOTICE_VERIFIED');

    // 4. HR schedules Exit Interview
    const scheduled = await hrOffboardRepo.scheduleInterview(created.id, {
      date: '2026-12-22',
      time: '11:00 AM',
      mode: 'In-Person',
      interviewer: 'Dr. Bukola Adeleke (PCCM Lead)',
      feedback: 'Discuss onboarding feedback and handover completion.',
    });
    expect(scheduled.status).toBe('INTERVIEW_SCHEDULED');
    expect(scheduled.exitInterview?.date).toBe('2026-12-22');

    // 5. Employee dashboard reads back the scheduled exit interview
    const employeeExits = await empOffboardRepo.getAll();
    const myExit = employeeExits.find((r) => r.id === created.id);
    expect(myExit?.exitInterview?.date).toBe('2026-12-22');
    expect(myExit?.exitInterview?.interviewer).toContain('Dr. Bukola Adeleke');
  });
});
