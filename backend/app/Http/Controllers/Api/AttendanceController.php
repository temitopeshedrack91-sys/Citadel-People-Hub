<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:200'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $query = AttendanceRecord::query();
        $user = $request->user();
        if ($user->role === 'EMPLOYEE') {
            $query->where('employee_staff_id', $user->staff_id);
        } elseif ($user->role === 'BUSINESS_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('entity_id', $user->entity_id));
        } elseif ($user->role === 'DEPARTMENT_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('department_id', $user->department_id));
        } elseif ($user->role === 'SYSTEM_ADMIN') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('entity_id', $user->entity_id));
        } else {
            $query->where('employee_staff_id', $user->staff_id ?? '');
        }
        if (isset($filters['date'])) {
            $query->whereDate('date', $filters['date']);
        }

        return response()->json(['data' => $query->latest('date')->latest('clock_in_time')->limit($filters['limit'] ?? 50)->get()->map(fn (AttendanceRecord $record) => $this->present($record))]);
    }

    public function todaySummary(Request $request): JsonResponse
    {
        $query = AttendanceRecord::query()->whereDate('date', today());
        $this->applyScope($query, $request->user());
        $rows = $query->get();
        $employeeQuery = Employee::query();
        $this->applyEmployeeScope($employeeQuery, $request->user());

        return response()->json([
            'total' => $rows->count(),
            'present' => $rows->whereIn('status', ['Present', 'Late'])->count(),
            'late' => $rows->where('status', 'Late')->count(),
            'absent' => max(0, $employeeQuery->count() - $rows->pluck('employee_id')->unique()->count()),
        ]);
    }

    public function clockIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employeeId' => ['required', 'uuid', 'exists:employees,id'],
            'employeeName' => ['required', 'string', 'max:180'],
            'staffId' => ['required', 'string', 'max:50'],
            'entity' => ['required', 'string', 'max:180'],
            'department' => ['required', 'string', 'max:180'],
        ]);
        $record = DB::transaction(function () use ($request, $data) {
            $employee = Employee::query()->lockForUpdate()->findOrFail($data['employeeId']);
            $this->ensureCanClock($request, $employee);
            abort_if($employee->staff_id !== $data['staffId'], 422, 'Employee identity mismatch.');
            abort_if($employee->status === 'Inactive', 422, 'Inactive employees cannot record attendance.');
            abort_if(
                AttendanceRecord::query()
                    ->where('employee_id', $employee->id)
                    ->whereDate('date', today())
                    ->whereNull('clock_out_time')
                    ->exists(),
                409,
                'Clock out of the active attendance record before starting another session.'
            );

            $record = AttendanceRecord::create([
                'employee_id' => $employee->id,
                'employee_staff_id' => $employee->staff_id,
                'employee_name' => $employee->full_name,
                'entity_name' => $employee->entity()->value('name') ?? '',
                'department_name' => $employee->department()->value('name') ?? '',
                'date' => today(),
                'clock_in_time' => now(),
                'status' => 'Present',
                'verification_source' => 'Web_SelfService',
            ]);
            AuditLogger::record($request, 'Attendance & Biometrics', 'Clocked in', $record->id, $record->employee_name, null, 'Present');

            return $record;
        });

        return response()->json(['data' => $this->present($record)], 201);
    }

    public function clockOut(Request $request, AttendanceRecord $attendanceRecord): JsonResponse
    {
        $record = DB::transaction(function () use ($request, $attendanceRecord) {
            $record = AttendanceRecord::query()->lockForUpdate()->findOrFail($attendanceRecord->id);
            $employee = Employee::query()->findOrFail($record->employee_id);
            $this->ensureCanClock($request, $employee);
            abort_if($record->clock_out_time, 409, 'Attendance record is already closed.');
            abort_if(! $record->clock_in_time, 409, 'Attendance record has no clock-in time.');

            $out = now();
            $hours = round($record->clock_in_time->diffInSeconds($out) / 3600, 2);
            $record->update(['clock_out_time' => $out, 'duration_hours' => $hours]);
            AuditLogger::record($request, 'Attendance & Biometrics', 'Clocked out', $record->id, $record->employee_name, 'Clocked in', 'Clocked out');

            return $record;
        });

        return response()->json(['data' => $this->present($record)]);
    }

    private function applyScope($query, $user): void
    {
        if ($user->role === 'EMPLOYEE') {
            $query->where('employee_staff_id', $user->staff_id);
        } elseif ($user->role === 'BUSINESS_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('entity_id', $user->entity_id));
        } elseif ($user->role === 'DEPARTMENT_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('department_id', $user->department_id));
        } elseif ($user->role === 'SYSTEM_ADMIN') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('entity_id', $user->entity_id));
        } else {
            $query->where('employee_staff_id', $user->staff_id ?? '');
        }
    }

    private function applyEmployeeScope($query, $user): void
    {
        if ($user->role === 'EMPLOYEE') {
            $query->where('staff_id', $user->staff_id);
        } elseif ($user->role === 'BUSINESS_HEAD') {
            $query->where('entity_id', $user->entity_id);
        } elseif ($user->role === 'DEPARTMENT_HEAD') {
            $query->where('department_id', $user->department_id);
        } elseif ($user->role === 'SYSTEM_ADMIN') {
            $query->where('entity_id', $user->entity_id);
        } else {
            $query->where('staff_id', $user->staff_id ?? '');
        }
    }

    private function ensureCanClock(Request $request, Employee $employee): void
    {
        $user = $request->user();
        $allowed = $user->role === 'PCCM_SUPER_ADMIN'
            || ($user->role === 'EMPLOYEE' && $user->staff_id === $employee->staff_id);
        abort_unless($allowed, 403, 'Only the employee or PCCM can record attendance.');
    }

    private function present(AttendanceRecord $record): array
    {
        return [
            'id' => $record->id,
            'employeeId' => $record->employee_id,
            'employeeStaffId' => $record->employee_staff_id,
            'employeeName' => $record->employee_name,
            'entityName' => $record->entity_name,
            'departmentName' => $record->department_name,
            'date' => $record->date->format('Y-m-d'),
            'clockInTime' => $record->clock_in_time?->toISOString(),
            'clockOutTime' => $record->clock_out_time?->toISOString(),
            'durationHours' => $record->duration_hours,
            'status' => $record->status,
            'verificationSource' => $record->verification_source,
            'deviceId' => $record->device_id,
            'notes' => $record->notes,
        ];
    }
}
