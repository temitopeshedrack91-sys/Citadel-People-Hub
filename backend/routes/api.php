<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\IdentityLinkController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TalentController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => config('app.name')]));
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
        Route::get('/auth/user', [AuthController::class, 'me']);
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/entities', [OrganizationController::class, 'entities']);
        Route::post('/entities', [OrganizationController::class, 'createEntity'])->middleware('throttle:30,1');
        Route::get('/departments', [OrganizationController::class, 'departments']);
        Route::post('/departments', [OrganizationController::class, 'createDepartment'])->middleware('throttle:30,1');
        Route::patch('/departments/{department}', [OrganizationController::class, 'updateDepartment'])->middleware('throttle:30,1');

        Route::apiResource('employees', EmployeeController::class)->except(['destroy'])->middleware('throttle:60,1');
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('throttle:30,1');

        Route::get('/leave-requests', [LeaveController::class, 'index']);
        Route::get('/employees/{employeeId}/leave-requests', [LeaveController::class, 'forEmployee']);
        Route::post('/leave-requests', [LeaveController::class, 'store'])->middleware('throttle:30,1');
        Route::patch('/leave-requests/{leaveRequest}/status', [LeaveController::class, 'updateStatus'])->middleware('throttle:30,1');
        Route::get('/leave/categories', [LeaveController::class, 'categories']);
        Route::get('/leave/balances', [LeaveController::class, 'balances']);
        Route::get('/employees/{employeeId}/leave-balances', [LeaveController::class, 'balances']);

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
        Route::patch('/onboarding-journeys/{journey}/tasks/{taskId}', [TalentController::class, 'updateTask']);
        Route::patch('/onboarding-journeys/{journey}/documents/{documentId}', [TalentController::class, 'updateDocument']);
        Route::patch('/onboarding-journeys/{journey}/orientation/{itemId}', [TalentController::class, 'updateOrientation']);
        Route::get('/checklist-templates', [TalentController::class, 'checklistTemplates']);
        Route::post('/checklist-templates', [TalentController::class, 'createChecklistTemplate'])->middleware('throttle:30,1');
        Route::get('/requisitions', [TalentController::class, 'requisitions']);
        Route::post('/requisitions', [TalentController::class, 'createRequisition'])->middleware('throttle:30,1');
        Route::patch('/requisitions/{requisition}/status', [TalentController::class, 'updateRequisitionStatus'])->middleware('throttle:30,1');
    });
});
