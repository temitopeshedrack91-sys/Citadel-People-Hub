<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmployeeController;
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
        Route::post('/tasks/{task}/comments', [TaskController::class, 'addComment'])->middleware('throttle:60,1');

        Route::get('/attendance', [AttendanceController::class, 'index']);
        Route::get('/attendance/today-summary', [AttendanceController::class, 'todaySummary']);
        Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn'])->middleware('throttle:20,1');
        Route::post('/attendance/{attendanceRecord}/clock-out', [AttendanceController::class, 'clockOut'])->middleware('throttle:20,1');

        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store'])->middleware('throttle:20,1');
        Route::get('/documents/{document}/download', [DocumentController::class, 'download']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

        Route::get('/audit-logs', [AuditController::class, 'index']);

        Route::get('/onboarding-journeys', [TalentController::class, 'journeys']);
        Route::patch('/onboarding-journeys/{journey}/tasks/{taskId}', [TalentController::class, 'updateTask']);
        Route::get('/requisitions', [TalentController::class, 'requisitions']);
    });
});
