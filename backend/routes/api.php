<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClaimController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\GovernanceController;
use App\Http\Controllers\Api\IdentityLinkController;
use App\Http\Controllers\Api\JobTitleController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OffboardingController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\PayGradeController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PerformanceController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\RealtimeController;
use App\Http\Controllers\Api\RecruitmentPipelineController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TalentController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TimesheetController;
use App\Http\Controllers\Api\TrainingController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => config('app.name')]));
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:30,1')->name('login');
    // Stream endpoint supports either Bearer header or ?token= for browser EventSource compatibility.
    Route::get('/realtime/stream', [RealtimeController::class, 'stream'])->middleware('throttle:120,1');

    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
        Route::get('/auth/user', [AuthController::class, 'me']);
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/entities', [OrganizationController::class, 'entities']);
        Route::post('/entities', [OrganizationController::class, 'createEntity'])->middleware('throttle:30,1');
        Route::get('/departments', [OrganizationController::class, 'departments']);
        Route::post('/departments', [OrganizationController::class, 'createDepartment'])->middleware('throttle:30,1');
        Route::patch('/departments/{department}', [OrganizationController::class, 'updateDepartment'])->middleware('throttle:30,1');

        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('/realtime/events', [RealtimeController::class, 'events']);

        Route::apiResource('employees', EmployeeController::class)->except(['destroy'])->middleware('throttle:60,1');
        Route::get('/employees/{employee}/hierarchy', [EmployeeController::class, 'hierarchy'])->middleware('throttle:60,1');
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('throttle:30,1');

        Route::get('/leave-requests', [LeaveController::class, 'index']);
        Route::get('/employees/{employeeId}/leave-requests', [LeaveController::class, 'forEmployee']);
        Route::post('/leave-requests', [LeaveController::class, 'store'])->middleware('throttle:30,1');
        Route::patch('/leave-requests/{leaveRequest}/status', [LeaveController::class, 'updateStatus'])->middleware('throttle:30,1');
        Route::get('/leave/team-calendar', [LeaveController::class, 'teamCalendar']);
        Route::get('/leave/categories', [LeaveController::class, 'categories']);
        Route::get('/leave/balances', [LeaveController::class, 'balances']);
        Route::get('/employees/{employeeId}/leave-balances', [LeaveController::class, 'balances']);
        Route::post('/leave/entitlements', [LeaveController::class, 'storeEntitlement'])->middleware('throttle:30,1');

        // Payroll Backend Endpoints
        Route::prefix('payroll')->group(function () {
            Route::get('/templates', [PayrollController::class, 'templates']);
            Route::post('/templates', [PayrollController::class, 'storeTemplate'])->middleware('throttle:30,1');

            Route::get('/assignments', [PayrollController::class, 'assignments']);
            Route::post('/assignments', [PayrollController::class, 'assignTemplate'])->middleware('throttle:30,1');

            Route::get('/runs', [PayrollController::class, 'runs']);
            Route::post('/runs', [PayrollController::class, 'generateRun'])->middleware('throttle:15,1');
            Route::get('/runs/{run}', [PayrollController::class, 'showRun']);
            Route::post('/runs/{run}/finalize', [PayrollController::class, 'finalizeRun'])->middleware('throttle:15,1');

            Route::get('/payslips/{item}', [PayrollController::class, 'showPayslip']);
            Route::patch('/payslips/{item}/paid', [PayrollController::class, 'markPayslipPaid'])->middleware('throttle:30,1');

            Route::get('/loans', [PayrollController::class, 'loans']);
            Route::post('/loans', [PayrollController::class, 'storeLoan'])->middleware('throttle:30,1');
            Route::patch('/loans/{loan}/approve', [PayrollController::class, 'approveLoan'])->middleware('throttle:30,1');

            Route::get('/deductions', [PayrollController::class, 'deductions']);
            Route::post('/deductions', [PayrollController::class, 'storeDeduction'])->middleware('throttle:30,1');

            Route::get('/provident-funds', [PayrollController::class, 'providentFunds']);
            Route::post('/provident-funds', [PayrollController::class, 'storeProvidentFund'])->middleware('throttle:30,1');
        });

        // Projects & Tasks (Trellis)
        Route::apiResource('projects', ProjectController::class)->middleware('throttle:60,1');
        Route::apiResource('tasks', TaskController::class)->middleware('throttle:60,1');
        Route::patch('/tasks/{task}/status', [TaskController::class, 'updateStatus'])->middleware('throttle:60,1');
        Route::patch('/tasks/{task}/assignment', [TaskController::class, 'updateAssignment'])->middleware('throttle:60,1');
        Route::patch('/tasks/{task}/checklist', [TaskController::class, 'updateChecklist'])->middleware('throttle:60,1');
        Route::post('/tasks/{task}/comments', [TaskController::class, 'addComment'])->middleware('throttle:60,1');

        Route::get('/attendance', [AttendanceController::class, 'index']);
        Route::get('/attendance/today-summary', [AttendanceController::class, 'todaySummary']);
        Route::get('/attendance/biometric-punches', [AttendanceController::class, 'biometricPunches']);
        Route::post('/attendance/biometric-imports', [AttendanceController::class, 'importBiometricPunches'])->middleware('throttle:10,1');
        Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn'])->middleware('throttle:20,1');
        Route::post('/attendance/{attendanceRecord}/clock-out', [AttendanceController::class, 'clockOut'])->middleware('throttle:20,1');

        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store'])->middleware('throttle:20,1');
        Route::get('/documents/{document}/download', [DocumentController::class, 'download']);

        // Employee Documents
        Route::get('/employees/{employee}/documents', [DocumentController::class, 'forEmployee']);
        Route::post('/employees/{employee}/documents', [DocumentController::class, 'storeEmployeeDocument'])->middleware('throttle:20,1');
        Route::post('/employees/{employee}/documents/{document}/replace', [DocumentController::class, 'replaceEmployeeDocument'])->middleware('throttle:20,1');
        Route::delete('/employees/{employee}/documents/{document}', [DocumentController::class, 'deleteEmployeeDocument'])->middleware('throttle:20,1');
        Route::get('/employees/{employee}/documents/{document}/download', [DocumentController::class, 'downloadEmployeeDocument']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

        Route::get('/audit-logs', [AuditController::class, 'index']);

        Route::get('/identity-links', [IdentityLinkController::class, 'index']);
        Route::get('/identity-links/{identityLink}', [IdentityLinkController::class, 'show']);
        Route::post('/identity-links', [IdentityLinkController::class, 'store']);
        Route::delete('/identity-links/{identityLink}', [IdentityLinkController::class, 'revoke']);
        Route::get('/auth/identity', [IdentityLinkController::class, 'me']);

        Route::get('/onboarding-journeys', [TalentController::class, 'journeys']);
        Route::post('/onboarding-journeys', [TalentController::class, 'createJourney'])->middleware('throttle:30,1');
        Route::post('/onboarding-journeys/{journey}/tasks', [TalentController::class, 'createOnboardingTask'])->middleware('throttle:30,1');
        Route::patch('/onboarding-journeys/{journey}/tasks/reorder', [TalentController::class, 'reorderTasks']);
        Route::post('/onboarding-journeys/{journey}/tasks/{taskId}/reminder', [TalentController::class, 'remindTask']);
        Route::patch('/onboarding-journeys/{journey}/tasks/{taskId}', [TalentController::class, 'updateTask']);
        Route::post('/onboarding-journeys/{journey}/reminders', [TalentController::class, 'remindBulkTasks']);
        Route::post('/onboarding-journeys/{journey}/complete', [TalentController::class, 'completeJourney']);
        Route::patch('/onboarding-journeys/{journey}/documents/{documentId}', [TalentController::class, 'updateDocument']);
        Route::patch('/onboarding-journeys/{journey}/orientation/{itemId}', [TalentController::class, 'updateOrientation']);
        Route::get('/checklist-templates', [TalentController::class, 'checklistTemplates']);
        Route::post('/checklist-templates', [TalentController::class, 'createChecklistTemplate'])->middleware('throttle:30,1');
        Route::patch('/checklist-templates/{template}', [TalentController::class, 'updateChecklistTemplate'])->middleware('throttle:30,1');

        // 5-Stage Offboarding & Clearance Workflow
        Route::get('/offboarding/requests', [OffboardingController::class, 'index']);
        Route::post('/offboarding/requests', [OffboardingController::class, 'store'])->middleware('throttle:30,1');
        Route::post('/offboarding/requests/{offboardingRequest}/manager-endorse', [OffboardingController::class, 'managerEndorse']);
        Route::post('/offboarding/requests/{offboardingRequest}/verify-notice', [OffboardingController::class, 'verifyNotice']);
        Route::post('/offboarding/requests/{offboardingRequest}/schedule-interview', [OffboardingController::class, 'scheduleInterview']);
        Route::patch('/offboarding/requests/{offboardingRequest}/clearance', [OffboardingController::class, 'updateClearance']);
        Route::post('/offboarding/requests/{offboardingRequest}/finalize', [OffboardingController::class, 'finalize']);
        Route::get('/requisitions', [TalentController::class, 'requisitions']);
        Route::post('/requisitions', [TalentController::class, 'createRequisition'])->middleware('throttle:30,1');
        Route::patch('/requisitions/{requisition}/status', [TalentController::class, 'updateRequisitionStatus'])->middleware('throttle:30,1');

        // Organizational Classifications (Job Titles & Pay Grades)
        Route::apiResource('job-titles', JobTitleController::class)->middleware('throttle:60,1');
        Route::apiResource('pay-grades', PayGradeController::class)->middleware('throttle:60,1');

        // Timesheet Management & Workflow
        Route::get('/timesheets', [TimesheetController::class, 'index']);
        Route::get('/timesheets/{timesheet}', [TimesheetController::class, 'show']);
        Route::post('/timesheets', [TimesheetController::class, 'store'])->middleware('throttle:30,1');
        Route::post('/timesheets/{timesheet}/submit', [TimesheetController::class, 'submit'])->middleware('throttle:30,1');
        Route::post('/timesheets/{timesheet}/approve', [TimesheetController::class, 'approve'])->middleware('throttle:30,1');
        Route::post('/timesheets/{timesheet}/reject', [TimesheetController::class, 'reject'])->middleware('throttle:30,1');
        Route::post('/timesheets/{timesheet}/reset', [TimesheetController::class, 'reset'])->middleware('throttle:30,1');

        // Performance Reviews & KPIs
        Route::get('/performance/kpis', [PerformanceController::class, 'kpis']);
        Route::post('/performance/kpis', [PerformanceController::class, 'storeKpi'])->middleware('throttle:30,1');
        Route::patch('/performance/kpis/{kpi}', [PerformanceController::class, 'updateKpi'])->middleware('throttle:30,1');
        Route::delete('/performance/kpis/{kpi}', [PerformanceController::class, 'destroyKpi'])->middleware('throttle:30,1');
        Route::get('/performance/reviews', [PerformanceController::class, 'reviews']);
        Route::get('/performance/reviews/{performanceReview}', [PerformanceController::class, 'showReview']);
        Route::post('/performance/reviews', [PerformanceController::class, 'storeReview'])->middleware('throttle:30,1');
        Route::post('/performance/reviews/{performanceReview}/evaluate', [PerformanceController::class, 'evaluateReview'])->middleware('throttle:30,1');
        Route::post('/performance/reviews/{performanceReview}/approve', [PerformanceController::class, 'approveReview'])->middleware('throttle:30,1');

        // Recruitment Pipeline & Candidate ATS
        Route::get('/recruitment/vacancies', [RecruitmentPipelineController::class, 'vacancies']);
        Route::post('/recruitment/vacancies', [RecruitmentPipelineController::class, 'storeVacancy'])->middleware('throttle:30,1');
        Route::patch('/recruitment/vacancies/{jobVacancy}', [RecruitmentPipelineController::class, 'updateVacancy'])->middleware('throttle:30,1');
        Route::get('/recruitment/candidates', [RecruitmentPipelineController::class, 'candidates']);
        Route::get('/recruitment/candidates/{candidate}', [RecruitmentPipelineController::class, 'showCandidate']);
        Route::post('/recruitment/candidates', [RecruitmentPipelineController::class, 'storeCandidate'])->middleware('throttle:30,1');
        Route::patch('/recruitment/candidates/{candidate}/status', [RecruitmentPipelineController::class, 'updateCandidateStatus'])->middleware('throttle:30,1');
        Route::post('/recruitment/candidates/{candidate}/interviews', [RecruitmentPipelineController::class, 'scheduleInterview'])->middleware('throttle:30,1');
        Route::patch('/recruitment/interviews/{candidateInterview}', [RecruitmentPipelineController::class, 'updateInterviewResult'])->middleware('throttle:30,1');

        // Corporate Training & Learning Management
        Route::get('/training/courses', [TrainingController::class, 'courses']);
        Route::post('/training/courses', [TrainingController::class, 'storeCourse'])->middleware('throttle:30,1');
        Route::patch('/training/courses/{trainingCourse}', [TrainingController::class, 'updateCourse'])->middleware('throttle:30,1');
        Route::get('/training/sessions', [TrainingController::class, 'sessions']);
        Route::post('/training/sessions', [TrainingController::class, 'storeSession'])->middleware('throttle:30,1');
        Route::post('/training/sessions/{trainingSession}/enroll', [TrainingController::class, 'enrollEmployee'])->middleware('throttle:30,1');
        Route::patch('/training/enrollments/{employeeTraining}', [TrainingController::class, 'updateEmployeeTraining'])->middleware('throttle:30,1');

        // Enterprise HR Analytics & Reporting
        Route::get('/reports/workforce', [ReportController::class, 'workforce']);
        Route::get('/reports/leave-utilization', [ReportController::class, 'leaveUtilization']);
        Route::get('/reports/attendance-summary', [ReportController::class, 'attendanceSummary']);
        Route::get('/reports/recruitment-summary', [ReportController::class, 'recruitmentSummary']);

        // Employee Claims & Expense Reimbursements (OrangeHRM Parity)
        Route::get('/claims/events', [ClaimController::class, 'events']);
        Route::post('/claims/events', [ClaimController::class, 'storeEvent'])->middleware('throttle:30,1');
        Route::get('/claims/expense-types', [ClaimController::class, 'expenseTypes']);
        Route::post('/claims/expense-types', [ClaimController::class, 'storeExpenseType'])->middleware('throttle:30,1');
        Route::get('/claims', [ClaimController::class, 'requests']);
        Route::get('/claims/requests', [ClaimController::class, 'requests']);
        Route::get('/claims/requests/{claimRequest}', [ClaimController::class, 'show']);
        Route::get('/claims/{claimRequest}', [ClaimController::class, 'show']);
        Route::post('/claims', [ClaimController::class, 'store'])->middleware('throttle:30,1');
        Route::post('/claims/requests', [ClaimController::class, 'store'])->middleware('throttle:30,1');
        Route::post('/claims/requests/{claimRequest}/expenses', [ClaimController::class, 'addExpense'])->middleware('throttle:30,1');
        Route::post('/claims/{claimRequest}/expenses', [ClaimController::class, 'addExpense'])->middleware('throttle:30,1');
        Route::delete('/claims/expenses/{claimExpense}', [ClaimController::class, 'deleteExpense'])->middleware('throttle:30,1');
        Route::delete('/claims/{claimRequest}/expenses/{claimExpense}', [ClaimController::class, 'deleteExpense'])->middleware('throttle:30,1');
        Route::delete('/claims/requests/{claimRequest}/expenses/{claimExpense}', [ClaimController::class, 'deleteExpense'])->middleware('throttle:30,1');
        Route::post('/claims/requests/{claimRequest}/action', [ClaimController::class, 'action'])->middleware('throttle:30,1');
        Route::post('/claims/{claimRequest}/action', [ClaimController::class, 'action'])->middleware('throttle:30,1');

        // Workbook Governance Workflows (Sheet 5 Profile Change Approvals & Sheet 14 Lifecycle Events)
        Route::get('/governance/profile-change-requests', [GovernanceController::class, 'indexProfileChanges']);
        Route::post('/governance/profile-change-requests', [GovernanceController::class, 'storeProfileChange'])->middleware('throttle:30,1');
        Route::patch('/governance/profile-change-requests/{profileChangeRequest}/review', [GovernanceController::class, 'reviewProfileChange'])->middleware('throttle:30,1');
        Route::get('/governance/lifecycle-events', [GovernanceController::class, 'indexLifecycleEvents']);
        Route::post('/governance/lifecycle-events', [GovernanceController::class, 'storeLifecycleEvent'])->middleware('throttle:30,1');
        Route::patch('/governance/lifecycle-events/{employeeLifecycleEvent}/approve', [GovernanceController::class, 'approveLifecycleEvent'])->middleware('throttle:30,1');
    });
});
