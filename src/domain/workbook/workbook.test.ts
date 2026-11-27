import { test, expect } from 'vitest';

const assert = {
  equal: (actual: unknown, expected: unknown) => expect(actual).toBe(expected),
  ok: (value: unknown) => expect(Boolean(value)).toBe(true),
  match: (value: string, regex: RegExp) => expect(value).toMatch(regex),
  throws: (fn: () => unknown) => expect(fn).toThrow(),
};
import {
  WORKBOOK_PROJECT_SCOPE,
  WORKBOOK_ENTITIES,
  WORKBOOK_DEPARTMENTS,
  WORKBOOK_ROLE_SPECS,
  WORKBOOK_AMBIGUITIES_REGISTER,
  WORKBOOK_SECURITY_CONTROLS,
  WORKBOOK_V1_PRIORITIES,
  WORKBOOK_FUTURE_ROADMAP,
  resolveDepartmentBelongsToEntity,
  getReportingChainForDepartment,
  evaluateWorkbookPermission,
  detectForbiddenCredentials,
  EMPLOYEE_MASTER_FIELDS,
  calculateYearsOfService,
  evaluateEmployeeCompleteness,
  validateEmployeeFieldEdits,
  createProfileChangeRequest,
  reviewProfileChangeRequest,
  applyApprovedChangeRequest,
  createLifecycleEvent,
  applyApprovedLifecycleEvent,
  evaluateDocumentExpiry,
  WORKBOOK_LEGACY_DATA_SOURCES,
  validateBioDataMigrationCsv,
  generateSampleBioDataMigrationCsv,
  WORKBOOK_LEAVE_POLICIES,
  validateLeaveApplication,
  WORKBOOK_ATTENDANCE_SCHEDULES,
  resolveAttendanceSchedule,
  evaluateAttendancePunch,
  WORKBOOK_RECRUITMENT_STAGES,
  canAdvanceRecruitmentStage,
  advanceRecruitmentStage,
  calculateAssessmentWeightedScore,
  recordHrAssessmentDecision,
  evaluateTwoStageInterview,
  canActivateEmployeeFromPreOnboarding,
  DEFAULT_PRE_ONBOARDING_STEPS,
  evaluateOffboardingRevocation,
  resolveNotificationRule,
  WORKBOOK_M365_SERVICES,
  authorizeAiUseCase,
  generateWorkbookReport,
  exportReportToCsv,
} from './index';
import type { Employee, ExitRequest } from '../../types';
import type { ApplicantAssessmentRecord, RecruitmentWorkflowCase } from './types';

const sampleConfirmedEmployee: Employee = {
  id: 'emp-test-1',
  staffId: 'CGCC/101',
  fullName: 'Adaeze Nwosu',
  firstName: 'Adaeze',
  lastName: 'Nwosu',
  profilePhoto: 'https://citadel.ng/photos/101.jpg',
  dateOfBirth: '1990-05-12',
  gender: 'Female',
  phone: '+2348031112222',
  email: 'a.nwosu@thecitadelglobal.org',
  address: '15 Oregun Road, Ikeja, Lagos',
  emergencyContact: { name: 'Emeka Nwosu', relationship: 'Brother', phone: '+2348031112223' },
  nextOfKin: { name: 'Emeka Nwosu', relationship: 'Brother', phone: '+2348031112223', address: '15 Oregun Road' },
  entityId: 'entity-cgcc',
  entityName: 'Citadel Global Community Church (CGCC)',
  departmentId: 'dept-cgcc-ict',
  departmentName: 'ICT',
  jobTitle: 'Systems Analyst',
  gradeLevel: 'L3',
  employmentType: 'Full-Time',
  employmentDate: '2023-03-01',
  confirmationDate: '2023-09-01',
  managerId: 'emp-2',
  managerName: 'ICT Manager',
  contractStatus: 'Permanent',
  yearsOfService: 3,
  qualifications: [{ id: 'q1', degree: 'B.Sc', institution: 'UNILAG', yearCompleted: 2013, fieldOfStudy: 'CS' }],
  certifications: [{ id: 'c1', name: 'ITIL v4', issuingBody: 'AXELOS', yearObtained: 2022 }],
  bankPayroll: { bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Adaeze Nwosu', salaryGrade: 'L3', currency: 'NGN' },
  pensionHmo: { pfaName: 'Stanbic IBTC', rsaPin: 'PEN100123456', hmoProvider: 'Reliance HMO', hmoPlan: 'Gold', hmoIdNumber: 'REL-101' },
  status: 'Confirmed',
};

test('Sheets 1-3: Project Scope, 3 Entities, 15 Departments, Business Heads & Reporting Chains', () => {
  assert.equal(WORKBOOK_PROJECT_SCOPE.targetLaunchDate, '2026-10-04');
  assert.equal(WORKBOOK_ENTITIES.length, 3);
  assert.equal(WORKBOOK_DEPARTMENTS.length, 15);

  // CGCC has 8 departments, CSOG has 2, Holdings has 5
  assert.equal(WORKBOOK_DEPARTMENTS.filter((d) => d.entityShortCode === 'CGCC').length, 8);
  assert.equal(WORKBOOK_DEPARTMENTS.filter((d) => d.entityShortCode === 'CSOG').length, 2);
  assert.equal(WORKBOOK_DEPARTMENTS.filter((d) => d.entityShortCode === 'HOLDINGS').length, 5);

  // Valid vs mismatched entity-department pairing
  const validPair = resolveDepartmentBelongsToEntity('CGCC', 'Facilities');
  assert.equal(validPair.valid, true);
  assert.equal(validPair.department?.isGecSharedService, true);

  const mismatchPair = resolveDepartmentBelongsToEntity('CSOG', 'Bookshop');
  assert.equal(mismatchPair.valid, false);
  assert.match(mismatchPair.error || '', /Citadel Holdings/);

  // Transport & Logistics reports to Facilities Manager -> Pastor Christian Ike
  const transportChain = getReportingChainForDepartment('dept-cgcc-trans');
  assert.ok(transportChain.some((c) => c.includes('Facilities')));
  assert.ok(transportChain.some((c) => c.includes('Pastor Christian Ike')));

  // Holdings retail unit reports to Business Manager -> Ms. Olufisayo Bakare
  const bookshopChain = getReportingChainForDepartment('dept-ch-book');
  assert.ok(bookshopChain.some((c) => c.includes('Business Manager')));
  assert.ok(bookshopChain.some((c) => c.includes('Olufisayo Bakare')));
});

test('Sheet 4: 5-Role Governance enforces entity/department/self scope and approval gates', () => {
  assert.equal(Object.keys(WORKBOOK_ROLE_SPECS).length, 5);

  // Super Admin / HR needs no approval
  const hrEdit = evaluateWorkbookPermission({
    actorRole: 'SUPER_ADMIN_HR',
    action: 'EDIT_ANY_MODULE',
  });
  assert.equal(hrEdit.allowed, true);
  assert.equal(hrEdit.requiresApproval, false);

  // Business Head can edit own entity WITH HR/Super Admin approval, blocked on another entity
  const bhOwn = evaluateWorkbookPermission({
    actorRole: 'BUSINESS_HEAD',
    action: 'EDIT_ENTITY_UNIT',
    actorEntityId: 'entity-csog',
    targetEntityId: 'entity-csog',
  });
  assert.equal(bhOwn.allowed, true);
  assert.equal(bhOwn.requiresApproval, true);

  const bhOther = evaluateWorkbookPermission({
    actorRole: 'BUSINESS_HEAD',
    action: 'EDIT_ENTITY_UNIT',
    actorEntityId: 'entity-csog',
    targetEntityId: 'entity-holdings',
  });
  assert.equal(bhOther.allowed, false);

  // Department Head can edit team performance (with HR approval), cannot edit arbitrary modules
  const dhPerf = evaluateWorkbookPermission({
    actorRole: 'DEPARTMENT_HEAD',
    action: 'EDIT_TEAM_PERFORMANCE',
    actorDepartmentId: 'dept-cgcc-ict',
    targetDepartmentId: 'dept-cgcc-ict',
  });
  assert.equal(dhPerf.allowed, true);
  assert.equal(dhPerf.requiresApproval, true);

  const dhWrongDept = evaluateWorkbookPermission({
    actorRole: 'DEPARTMENT_HEAD',
    action: 'EDIT_TEAM_PERFORMANCE',
    actorDepartmentId: 'dept-cgcc-ict',
    targetDepartmentId: 'dept-cgcc-fin',
  });
  assert.equal(dhWrongDept.allowed, false);

  // Employee cannot edit peer record
  const empPeer = evaluateWorkbookPermission({
    actorRole: 'EMPLOYEE',
    action: 'UPLOAD_OWN_PROFILE_OR_DOCS',
    actorEmployeeId: 'emp-1',
    targetEmployeeId: 'emp-2',
  });
  assert.equal(empPeer.allowed, false);

  // System Admin requires Super Admin approval for backend changes
  const sysTech = evaluateWorkbookPermission({
    actorRole: 'SYSTEM_ADMIN',
    action: 'EDIT_TECHNICAL_BACKEND',
  });
  assert.equal(sysTech.allowed, true);
  assert.equal(sysTech.requiresApproval, true);
});

test('Sheet 5 & Sheet 1 Rule 4: 24 mandatory sensitive fields, edit permissions, credential guard & staged HR approval', () => {
  assert.equal(EMPLOYEE_MASTER_FIELDS.length, 24);
  assert.ok(EMPLOYEE_MASTER_FIELDS.every((f) => f.required && f.sensitive));
  assert.equal(EMPLOYEE_MASTER_FIELDS.filter((f) => f.editPolicy === 'EMPLOYEE_WITH_HR_APPROVAL').length, 11);
  assert.equal(EMPLOYEE_MASTER_FIELDS.filter((f) => f.editPolicy === 'HR_SUPER_ADMIN_ONLY').length, 13);

  // Completeness check
  const comp = evaluateEmployeeCompleteness(sampleConfirmedEmployee);
  assert.equal(comp.completedCount, 24);
  assert.equal(comp.percentComplete, 100);

  // Years of service calculation
  assert.equal(calculateYearsOfService('2025-11-27', '2026-11-26'), 0);
  assert.equal(calculateYearsOfService('2025-11-26', '2026-11-26'), 1);

  // Employee blocked from editing HR-only fields
  const blocked = validateEmployeeFieldEdits('EMPLOYEE', { entityName: 'Citadel Holdings', bankPayroll: 'New Bank' });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.blockedFields.length, 2);

  // Credential leak detection (Sheet 1 Rule 4)
  assert.ok(detectForbiddenCredentials('My ATM PIN is 1234').length > 0);
  const leakCheck = validateEmployeeFieldEdits('EMPLOYEE', { address: 'password: secret123' });
  assert.equal(leakCheck.allowed, false);
  assert.equal(leakCheck.credentialViolations.length, 1);

  // Staged profile change request -> HR approves -> live employee updated
  const req = createProfileChangeRequest({
    employee: sampleConfirmedEmployee,
    actorRole: 'EMPLOYEE',
    actorName: sampleConfirmedEmployee.fullName,
    proposedChanges: { phone: '+2348099998888', address: '22 Admiralty Way, Lekki' },
    reason: 'Relocated to Lekki',
  });
  assert.equal(req.status, 'PENDING_HR_APPROVAL');

  // Non-HR cannot approve
  assert.throws(() =>
    reviewProfileChangeRequest({
      request: req,
      reviewerRole: 'DEPARTMENT_HEAD',
      reviewerName: 'ICT Manager',
      decision: 'APPROVED',
    })
  );

  const approved = reviewProfileChangeRequest({
    request: req,
    reviewerRole: 'SUPER_ADMIN_HR',
    reviewerName: 'Sussan Afuwape',
    decision: 'APPROVED',
  });
  assert.equal(approved.status, 'APPROVED');

  const updatedEmp = applyApprovedChangeRequest(sampleConfirmedEmployee, approved);
  assert.equal(updatedEmp.phone, '+2348099998888');
  assert.equal(updatedEmp.address, '22 Admiralty Way, Lekki');
});

test('Sheet 7: Leave Management rules (entitlements, eligibility, attachments, advance planning & Direct HR routing)', () => {
  assert.equal(WORKBOOK_LEAVE_POLICIES.length, 6);

  // 1. Confirmed >=1yr employee applying for Annual Leave with attachment in advance -> VALID, MANAGER stage
  const validAnnual = validateLeaveApplication({
    employee: sampleConfirmedEmployee,
    leaveType: 'Annual Leave',
    startDate: '2026-12-10',
    endDate: '2026-12-14',
    today: '2026-11-26',
    attachmentName: 'Annual_Leave_Form.pdf',
    availableBalanceDays: 21,
    managerId: 'emp-2',
  });
  assert.equal(validAnnual.valid, true);
  assert.equal(validAnnual.calculatedDays, 5);
  assert.equal(validAnnual.initialApprovalStage, 'MANAGER');

  // 2. Probationary employee (<1yr) blocked from Annual & Sick Leave, allowed Compassionate (Direct HR)
  const probationEmp = {
    ...sampleConfirmedEmployee,
    id: 'emp-prob',
    status: 'Probation',
    contractStatus: 'Probation',
    confirmationDate: undefined,
    employmentDate: '2026-06-01',
    yearsOfService: 0,
  };
  const probAnnual = validateLeaveApplication({
    employee: probationEmp,
    leaveType: 'Annual Leave',
    startDate: '2026-12-10',
    endDate: '2026-12-12',
    today: '2026-11-26',
    attachmentName: 'form.pdf',
  });
  assert.equal(probAnnual.valid, false);
  assert.ok(probAnnual.errors.some((e) => e.includes('Confirmed')));
  assert.ok(probAnnual.errors.some((e) => e.includes('1 completed year')));

  const probCompassionate = validateLeaveApplication({
    employee: probationEmp,
    leaveType: 'Compassionate Leave',
    startDate: '2026-11-27',
    endDate: '2026-11-29',
    today: '2026-11-26',
  });
  assert.equal(probCompassionate.valid, true);
  assert.equal(probCompassionate.initialApprovalStage, 'HR');
  assert.equal(probCompassionate.requiresManagerSelection, false);

  // 3. Exam Leave routes directly to HR and requires School Note / Exam Timetable
  const examNoDoc = validateLeaveApplication({
    employee: sampleConfirmedEmployee,
    leaveType: 'Exam Leave',
    startDate: '2026-12-15',
    endDate: '2026-12-20',
    today: '2026-11-26',
  });
  assert.equal(examNoDoc.valid, false);
  assert.equal(examNoDoc.initialApprovalStage, 'HR');
  assert.ok(examNoDoc.errors.some((e) => e.includes('School Note / Exam Timetable')));

  // 4. Gender check: Female employee blocked from Paternity Leave
  const wrongGender = validateLeaveApplication({
    employee: sampleConfirmedEmployee,
    leaveType: 'Paternity Leave',
    startDate: '2026-12-15',
    endDate: '2026-12-20',
    today: '2026-11-26',
    attachmentName: 'birth_cert.pdf',
  });
  assert.equal(wrongGender.valid, false);
  assert.ok(wrongGender.errors.some((e) => e.includes('Male')));

  // 5. Same-day Sick Leave produces advisory warning (not hard block) when Medical Note is attached
  const acuteSick = validateLeaveApplication({
    employee: sampleConfirmedEmployee,
    leaveType: 'Sick Leave',
    startDate: '2026-11-26',
    endDate: '2026-11-27',
    today: '2026-11-26',
    attachmentName: 'doctor_note.pdf',
  });
  assert.equal(acuteSick.valid, true);
  assert.ok(acuteSick.warnings.length > 0);
});

test('Sheet 8: Attendance shift resolution, 10-min grace period, Facilities 7am shift & CSOG Event Day override', () => {
  assert.equal(WORKBOOK_ATTENDANCE_SCHEDULES.length, 5);

  // CGCC 9:00-16:00, 10-min grace: 09:10 is Present, 09:11 is Late (11 mins)
  const cgccOnTime = evaluateAttendancePunch({
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'ICT',
    date: '2026-11-26',
    clockInTime: '09:10 AM',
    clockOutTime: '04:05 PM',
    verificationSource: 'Biometric_ZKTeco',
  });
  assert.equal(cgccOnTime.status, 'Present');
  assert.equal(cgccOnTime.lateMinutes, 0);
  assert.equal(cgccOnTime.overtimeMinutes, 5);
  assert.equal(cgccOnTime.biometricCompliant, true);

  const cgccLate = evaluateAttendancePunch({
    entityName: 'CGCC',
    departmentName: 'Finance',
    date: '2026-11-26',
    clockInTime: '09:11',
    clockOutTime: '15:30',
    verificationSource: 'Web_SelfService',
  });
  assert.equal(cgccLate.status, 'Late');
  assert.equal(cgccLate.lateMinutes, 11);
  assert.equal(cgccLate.earlyDepartureMinutes, 30);
  assert.equal(cgccLate.biometricCompliant, false);

  // Facilities 7:00-16:00, grace cutoff 07:10
  const facSchedule = resolveAttendanceSchedule('CGCC', 'Facilities');
  assert.equal(facSchedule.shiftStart, '07:00');
  const facLate = evaluateAttendancePunch({
    entityName: 'CGCC',
    departmentName: 'Facilities',
    date: '2026-11-26',
    clockInTime: '07:15',
    clockOutTime: '16:00',
    verificationSource: 'Biometric_ZKTeco',
  });
  assert.equal(facLate.status, 'Late');
  assert.equal(facLate.lateMinutes, 15);
  assert.equal(facLate.graceCutoffTime, '07:10');

  // CSOG Event Day override (10:00 - 18:00)
  const csogEvent = evaluateAttendancePunch({
    entityName: 'Citadel School of Government',
    departmentName: 'Academy & Programmes',
    date: '2026-11-26',
    clockInTime: '10:08',
    clockOutTime: '18:00',
    verificationSource: 'Biometric_ZKTeco',
    isEventDay: true,
    eventShiftStart: '10:00',
    eventShiftEnd: '18:00',
  });
  assert.equal(csogEvent.status, 'Present');
  assert.equal(csogEvent.graceCutoffTime, '10:10');
});

test('Sheets 9-12: 10-Stage Recruitment, Assessments HR Final Gate, 2-Stage Interviews & Pre-Onboarding Activation', () => {
  assert.equal(WORKBOOK_RECRUITMENT_STAGES.length, 10);

  let recCase: RecruitmentWorkflowCase = {
    id: 'rec-1',
    jobTitle: 'Network Administrator',
    department: 'ICT',
    entity: 'CGCC',
    currentStage: 'VACANCY_IDENTIFIED',
    stageData: {
      reasonForVacancy: 'Campus network expansion',
      position: 'Network Administrator',
      department: 'ICT',
    },
    approvalsGranted: {},
    notificationsSent: [],
  };

  // Blocked without approval on Stage 1
  const blockedStage1 = canAdvanceRecruitmentStage(recCase, 'SUPER_ADMIN_HR');
  assert.equal(blockedStage1.allowed, false);
  assert.ok(blockedStage1.errors.some((e) => e.includes('requires formal approval')));

  // Grant approval and advance to Stage 2
  recCase.approvalsGranted.VACANCY_IDENTIFIED = { approver: 'Pastor Segun Bakare', approvedAt: '2026-11-26T09:00:00Z' };
  recCase = advanceRecruitmentStage(recCase, 'SUPER_ADMIN_HR');
  assert.equal(recCase.currentStage, 'MANPOWER_REQUEST');

  // Stage 8 Interview blocks Final Selection unless BOTH Technical (Physical) & Competency (Virtual) pass
  const interviewCase: RecruitmentWorkflowCase = {
    ...recCase,
    currentStage: 'INTERVIEW',
    stageData: { interviewQuestions: 'Q1-Q10', scorecard: 'Rubric v1', candidateProfile: 'Jane Doe' },
    interviewStage1Passed: true,
    interviewStage2Passed: false,
  };
  const blockedInterview = canAdvanceRecruitmentStage(interviewCase, 'SUPER_ADMIN_HR');
  assert.equal(blockedInterview.allowed, false);
  assert.ok(blockedInterview.errors.some((e) => e.includes('Technical - Physical')));

  // Sheet 10 Assessment scoring + mandatory HR final decision
  const scorePct = calculateAssessmentWeightedScore([
    { score: 45, maxScore: 50, weightPercent: 60 },
    { score: 32, maxScore: 40, weightPercent: 40 },
  ]);
  assert.equal(scorePct, 86);

  const assessment: ApplicantAssessmentRecord = {
    id: 'asmt-1',
    candidateName: 'Jane Doe',
    jobRole: 'Network Administrator',
    assessmentType: 'Technical',
    scoringMethod: 'Weighted Rubric (0-100)',
    aiAssistanceUsed: true,
    scores: [],
    weightedScorePercent: scorePct,
    hrFinalDecision: 'PENDING',
  };
  assert.throws(() => recordHrAssessmentDecision(assessment, 'DEPARTMENT_HEAD', 'ICT Manager', 'PASSED'));
  const decided = recordHrAssessmentDecision(assessment, 'SUPER_ADMIN_HR', 'Sussan Afuwape', 'PASSED');
  assert.equal(decided.hrFinalDecision, 'PASSED');

  // Sheet 11 Two-Stage Interview Evaluator
  const evalInterview = evaluateTwoStageInterview({
    stage1Interviewers: ['ICT Manager'],
    stage1Criteria: [{ criterion: 'Network Troubleshooting', weightPercent: 100, score: 4.5 }],
    stage2Interviewers: ['Sussan Afuwape'],
    stage2Criteria: [{ criterion: 'Citadel Values & Teamwork', weightPercent: 100, score: 4.0 }],
  });
  assert.equal(evalInterview.readyForFinalSelection, true);
  assert.equal(evalInterview.overallScore, 4.25);

  // Sheet 12 Pre-Onboarding Activation Gate
  const notReady = canActivateEmployeeFromPreOnboarding(DEFAULT_PRE_ONBOARDING_STEPS);
  assert.equal(notReady.ready, false);
  const allComplete = DEFAULT_PRE_ONBOARDING_STEPS.map((s) => ({
    ...s,
    candidateActionCompleted: true,
    hrActionCompleted: true,
    documentSigned: true,
    hrApproved: true,
  }));
  assert.equal(canActivateEmployeeFromPreOnboarding(allComplete).ready, true);
});

test('Sheets 6, 14, 15, 16, 17-24: Lifecycle, Offboarding Revocation, Document Expiry, Migration CSV, AI Guard & Reports CSV', () => {
  // Sheet 14 Lifecycle: Confirm a probationary employee -> unlocks Confirmed status
  const probEmp: Employee = { ...sampleConfirmedEmployee, status: 'Probation', contractStatus: 'Probation', confirmationDate: undefined };
  const confirmEvent = createLifecycleEvent({
    eventType: 'CONFIRMATION',
    employee: probEmp,
    trigger: 'Completed 6-month probation successfully',
    effectiveDate: '2026-11-26',
    changes: {},
  });
  const applied = applyApprovedLifecycleEvent(probEmp, confirmEvent, 'SUPER_ADMIN_HR', 'Sussan Afuwape');
  assert.equal(applied.employee.status, 'Confirmed');
  assert.equal(applied.employee.contractStatus, 'Permanent');
  assert.equal(applied.employee.confirmationDate, '2026-11-26');

  // Sheet 15 Offboarding Revocation Check
  const sampleExit: ExitRequest = {
    id: 'exit-1',
    employeeId: 'emp-1',
    employeeName: 'Test Staff',
    staffId: 'CGCC/101',
    departmentName: 'ICT',
    entityName: 'CGCC',
    resignationDate: '2026-11-01',
    proposedLastDay: '2026-12-05',
    noticePeriodDays: 34,
    noticeCompliant: true,
    reason: 'Relocation',
    managerName: 'ICT Manager',
    managerEndorsed: true,
    hrVerified: true,
    status: 'CLEARANCE_IN_PROGRESS',
    exitInterview: { date: '2026-12-01', time: '10:00 AM', interviewer: 'HR', mode: 'In-Person' },
    clearances: { it: true, facilities: true, finance: false, hr: false },
  };
  const revCheck = evaluateOffboardingRevocation(sampleExit);
  assert.equal(revCheck.readyToOffboard, false);
  assert.equal(revCheck.missingAccessRevocations.length, 2);

  // Sheet 16 Document Expiry Reminder
  assert.equal(evaluateDocumentExpiry('Passport', '2026-12-10', 30, '2026-11-26').state, 'EXPIRING_SOON');
  assert.equal(evaluateDocumentExpiry('Old Cert', '2026-10-01', 30, '2026-11-26').state, 'EXPIRED');

  // Sheets 6 & 22 Bio-Data Migration Validator
  assert.equal(WORKBOOK_LEGACY_DATA_SOURCES.length, 6);
  const sampleCsv = generateSampleBioDataMigrationCsv();
  const migReport = validateBioDataMigrationCsv(sampleCsv);
  assert.equal(migReport.totalRows, 2);
  assert.equal(migReport.validRows, 1);
  assert.equal(migReport.invalidRows, 1);

  // Sheet 17, 18, 19, 20, 21, 23, 24 sanity checks
  assert.ok(resolveNotificationRule('CANDIDATE_APPLICATION_RECEIVED')?.channel.includes('Email'));
  assert.equal(WORKBOOK_M365_SERVICES.length, 5);
  assert.equal(authorizeAiUseCase('ai-cv-draft', 'EMPLOYEE').allowed, false);
  assert.equal(authorizeAiUseCase('ai-cv-draft', 'SUPER_ADMIN_HR').humanApprovalRequired, true);
  assert.ok(WORKBOOK_SECURITY_CONTROLS.length >= 5);
  assert.ok(WORKBOOK_V1_PRIORITIES.length >= 6);
  assert.ok(WORKBOOK_FUTURE_ROADMAP.length >= 4);
  assert.ok(WORKBOOK_AMBIGUITIES_REGISTER.length >= 7);

  // Sheet 20 Report & CSV formula-injection-safe export
  const report = generateWorkbookReport({
    reportId: 'PROFILE_COMPLETENESS',
    employees: [sampleConfirmedEmployee],
  });
  assert.equal(report.rows.length, 1);
  const csv = exportReportToCsv(report);
  assert.ok(csv.includes('"CGCC/101"'));
  assert.ok(csv.includes('"100"'));
});
