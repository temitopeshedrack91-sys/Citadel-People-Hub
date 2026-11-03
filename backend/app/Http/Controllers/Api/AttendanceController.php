<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Manages daily staff attendance, web clock-in/out, and biometric punch imports.
 *
 * Biometric imports parse raw physical device clocking logs, resolve device IDs
 * against employee biometric identifiers, summarize daily first/last punches
 * into attendance records, and enforce idempotent imports on device_id + timestamp.
 */
class AttendanceController extends Controller
{
    /**
     * Retrieve paginated biometric device punches within authorized scope.
     *
     * GET /api/v1/attendance/biometric-punches
     *
     * Query params:
     * - per_page: integer (1-1000, default 1000).
     * - page: integer (page number).
     */
    public function biometricPunches(Request $request): JsonResponse
    {
        $this->authorizeBiometricImport($request);
        $filters = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $query = DB::table('biometric_attendance_punches');
        $role = strtoupper($request->user()->role);
        if ($role === 'BUSINESS_HEAD') {
            $query->where('scope_entity_id', $request->user()->entity_id ?? '');
        } elseif ($role === 'DEPARTMENT_HEAD') {
            $query->where('scope_department_id', $request->user()->department_id ?? 0);
        }

        $punchCount = (clone $query)->count();
        $latest = (clone $query)->orderByDesc('imported_at')->first(['file_name', 'imported_at']);
        $page = (clone $query)
            ->orderByDesc('punch_date')
            ->orderByDesc('local_timestamp')
            ->paginate($filters['per_page'] ?? 1000);

        return response()->json(['data' => [
            'punches' => collect($page->items())->map(fn (object $punch): array => [
                'deviceId' => $punch->device_id,
                'timestamp' => $punch->local_timestamp,
                'date' => $punch->punch_date,
                'time' => $punch->punch_time,
                'direction' => $punch->direction,
                'rawDirection' => $punch->raw_direction,
                'sourceLine' => $punch->source_line,
            ]),
            'pagination' => [
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
            ],
            'punchCount' => $punchCount,
            'lastFileName' => $latest?->file_name,
            'lastImportedAt' => $latest?->imported_at,
        ]]);
    }

    /**
     * Import raw biometric clock-in/out punches from physical device export files.
     *
     * POST /api/v1/attendance/biometric-imports
     *
     * Ingestion behavior:
     * 1. Matches punches against active employee biometric_device_id.
     * 2. Idempotent: Skips duplicate punches on (device_id, local_timestamp).
     * 3. Calculates daily first punch as clock-in and last punch as clock-out.
     * 4. Reports any unmatched device IDs without dropping records.
     *
     * Request body:
     * - fileName: Source export filename (required, max 255).
     * - punches: Array of punch objects (1-2000 per batch).
     *   - deviceId: Numeric/zero-padded biometric device ID.
     *   - timestamp: ISO datetime string YYYY-MM-DDTHH:mm:ss.
     *   - direction: 'in' | 'out' | 'unknown'.
     *
     * Response:
     * - data: Summary statistics (matchedRecords, unmatchedRecords, duplicateRecords, storedPunchCount).
     */
    public function importBiometricPunches(Request $request): JsonResponse
    {
        $this->authorizeBiometricImport($request);
        $data = $request->validate([
            'fileName' => ['required', 'string', 'max:255'],
            'punches' => ['required', 'array', 'min:1', 'max:2000'],
            'punches.*.deviceId' => ['required', 'string', 'max:100'],
            'punches.*.timestamp' => ['required', 'date_format:Y-m-d\\TH:i:s'],
            'punches.*.direction' => ['required', 'in:in,out,unknown'],
            'punches.*.rawDirection' => ['nullable', 'string', 'max:80'],
            'punches.*.sourceLine' => ['nullable', 'integer', 'min:1'],
        ]);

        $visibleEmployees = RoleAuthorization::visibleEmployees($request->user())->get([
            'id', 'staff_id', 'biometric_device_id', 'entity_id', 'department_id',
        ]);
        $batchId = (string) Str::uuid();
        $importedAt = now();
        $matchedRecords = 0;
        $duplicateRecords = 0;
        $unmatchedByDevice = [];

        $storedPunchCount = DB::transaction(function () use (
            $request,
            $data,
            $visibleEmployees,
            $batchId,
            $importedAt,
            &$matchedRecords,
            &$duplicateRecords,
            &$unmatchedByDevice,
        ): int {
            $stored = 0;
            foreach ($data['punches'] as $punch) {
                $deviceId = trim(str_replace("\u{00A0}", ' ', $punch['deviceId']));
                $timestamp = $punch['timestamp'];
                $match = $this->matchBiometricDevice($deviceId, $visibleEmployees);
                if ($match['employee']) {
                    $matchedRecords++;
                    $identity = 'staff:'.trim($match['employee']->staff_id).'|'.$timestamp;
                } else {
                    $identity = 'device:'.$deviceId.'|'.$timestamp;
                    $this->recordUnmatchedDevice($unmatchedByDevice, $deviceId, $timestamp, $punch['sourceLine'] ?? null, $match['candidateStaffIds']);
                }

                $inserted = DB::table('biometric_attendance_punches')->insertOrIgnore([
                    'employee_id' => $match['employee']?->id,
                    'employee_staff_id' => $match['employee']?->staff_id,
                    'scope_entity_id' => $match['employee']?->entity_id ?? $request->user()->entity_id,
                    'scope_department_id' => $match['employee']?->department_id ?? $request->user()->department_id,
                    'device_id' => $deviceId,
                    'local_timestamp' => $timestamp,
                    'punch_date' => substr($timestamp, 0, 10),
                    'punch_time' => substr($timestamp, 11, 8),
                    'direction' => $punch['direction'],
                    'raw_direction' => $punch['rawDirection'] ?? null,
                    'source_line' => $punch['sourceLine'] ?? null,
                    'import_batch_id' => $batchId,
                    'file_name' => $data['fileName'],
                    'imported_by_user_id' => $request->user()->id,
                    'imported_at' => $importedAt,
                    'punch_identity_hash' => hash('sha256', $identity),
                    'created_at' => $importedAt,
                    'updated_at' => $importedAt,
                ]);

                if ($inserted === 1) {
                    $stored++;
                } else {
                    $duplicateRecords++;
                }
            }

            AuditLogger::record(
                $request,
                'Attendance & Biometrics',
                'Imported biometric punches',
                $batchId,
                $data['fileName'],
                null,
                "Stored {$stored}; duplicates {$duplicateRecords}; unmatched ".array_sum(array_column($unmatchedByDevice, 'occurrences')),
            );

            return $stored;
        });

        return response()->json(['data' => [
            'batchId' => $batchId,
            'fileName' => $data['fileName'],
            'importedAt' => $importedAt->toISOString(),
            'totalRecords' => count($data['punches']),
            'matchedRecords' => $matchedRecords,
            'unmatchedRecords' => count($data['punches']) - $matchedRecords,
            'duplicateRecords' => $duplicateRecords,
            'storedPunchCount' => $this->scopedBiometricPunchCount($request),
            'unmatchedDeviceIds' => array_values($unmatchedByDevice),
            'insertedInBatch' => $storedPunchCount,
        ]], 201);
    }

    /**
     * List daily attendance records, optionally filtered by date.
     *
     * GET /api/v1/attendance
     * Query params:
     * - date: YYYY-MM-DD (optional date filter).
     * - limit: integer (1-200, default 50).
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:200'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $query = AttendanceRecord::query();
        $this->applyScope($query, $request->user());
        if (isset($filters['date'])) {
            $query->whereDate('date', $filters['date']);
        }

        return response()->json(['data' => $query->latest('date')->latest('clock_in_time')->limit($filters['limit'] ?? 50)->get()->map(fn (AttendanceRecord $record) => $this->present($record))]);
    }

    /**
     * Compute real-time attendance headcounts for the current working day.
     *
     * GET /api/v1/attendance/today-summary
     *
     * Response:
     * - total: Total clocking records recorded today.
     * - present: Headcount present or late.
     * - late: Headcount flagged as arriving past shift schedule.
     * - absent: Expected active staff minus attendees.
     */
    public function todaySummary(Request $request): JsonResponse
    {
        $query = AttendanceRecord::query()->whereDate('date', today());
        $this->applyScope($query, $request->user());
        $rows = $query->get();
        $employeeQuery = RoleAuthorization::visibleEmployees($request->user());

        return response()->json([
            'total' => $rows->count(),
            'present' => $rows->whereIn('status', ['Present', 'Late'])->count(),
            'late' => $rows->where('status', 'Late')->count(),
            'absent' => max(0, $employeeQuery->count() - $rows->pluck('employee_id')->unique()->count()),
        ]);
    }

    /**
     * Self-service or supervisor web clock-in.
     *
     * POST /api/v1/attendance/clock-in
     */
    public function clockIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
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

    /**
     * Complete an active attendance record with clock-out time and duration.
     *
     * POST /api/v1/attendance/{attendanceRecord}/clock-out
     */
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
        $role = RoleAuthorization::canonical($user->role);
        abort_if($role === null || $role === 'VIEWER', 403, 'You are not authorized to access attendance records.');

        $rawRole = strtoupper(trim($user->role));
        if ($role === 'EMPLOYEE' || in_array($rawRole, ['BUSINESS_HEAD', 'DEPARTMENT_HEAD'], true)) {
            $query->whereIn('employee_id', RoleAuthorization::visibleEmployees($user)->select('id'));
        }
    }

    private function ensureCanClock(Request $request, Employee $employee): void
    {
        $user = $request->user();
        $canManageWithinScope = RoleAuthorization::canManageEmployee($user, $employee);
        $canClockForSelf = RoleAuthorization::canonical($user->role) === 'EMPLOYEE'
            && $user->staff_id !== null
            && $user->staff_id === $employee->staff_id;
        abort_unless($canManageWithinScope || $canClockForSelf, 403, 'You are not authorized to record attendance for this employee.');
    }

    private function authorizeBiometricImport(Request $request): void
    {
        abort_unless(RoleAuthorization::canManageEmployeeRecords($request->user()), 403, 'Only authorized HR staff may access biometric imports.');
    }

    private function scopedBiometricPunchCount(Request $request): int
    {
        $query = DB::table('biometric_attendance_punches');
        $role = strtoupper($request->user()->role);
        if ($role === 'BUSINESS_HEAD') {
            $query->where('scope_entity_id', $request->user()->entity_id ?? '');
        } elseif ($role === 'DEPARTMENT_HEAD') {
            $query->where('scope_department_id', $request->user()->department_id ?? 0);
        }

        return $query->count();
    }

    /** @return array{employee: ?Employee, candidateStaffIds: array<int, string>} */
    private function matchBiometricDevice(string $deviceId, $employees): array
    {
        $explicit = $employees->filter(fn (Employee $employee) => $employee->biometric_device_id !== null
            && trim(str_replace("\u{00A0}", ' ', $employee->biometric_device_id)) === $deviceId);
        if ($explicit->count() === 1) {
            return ['employee' => $explicit->first(), 'candidateStaffIds' => []];
        }
        if ($explicit->count() > 1) {
            return ['employee' => null, 'candidateStaffIds' => $explicit->pluck('staff_id')->all()];
        }

        $exact = $employees->filter(fn (Employee $employee) => trim($employee->staff_id) === $deviceId);
        if ($exact->count() === 1) {
            return ['employee' => $exact->first(), 'candidateStaffIds' => []];
        }

        $normalized = strtoupper(preg_replace('/[-_\/\s]/', '', $deviceId) ?? '');
        if (strlen($normalized) >= 3 && preg_match('/[A-Z]/', $normalized)) {
            $codeMatches = $employees->filter(fn (Employee $employee) => strtoupper(preg_replace('/[-_\/\s]/', '', trim($employee->staff_id)) ?? '') === $normalized
            );
            if ($codeMatches->count() === 1) {
                return ['employee' => $codeMatches->first(), 'candidateStaffIds' => []];
            }
        }

        if (preg_match('/^\d{4}$/', $deviceId)) {
            $candidates = $employees->filter(function (Employee $employee) use ($deviceId): bool {
                if (! preg_match('/^[A-Za-z][A-Za-z0-9]*[\/-](\d+)$/', trim($employee->staff_id), $match)) {
                    return false;
                }

                return str_pad($match[1], 4, '0', STR_PAD_LEFT) === $deviceId;
            });
            if ($candidates->count() === 1) {
                return ['employee' => $candidates->first(), 'candidateStaffIds' => []];
            }

            return ['employee' => null, 'candidateStaffIds' => $candidates->pluck('staff_id')->all()];
        }

        return ['employee' => null, 'candidateStaffIds' => []];
    }

    private function recordUnmatchedDevice(array &$records, string $deviceId, string $timestamp, ?int $sourceLine, array $candidates): void
    {
        $reason = $candidates ? 'ambiguous_staff_match' : (preg_match('/^\d{4}$/', $deviceId) ? 'no_staff_record' : 'invalid_device_id_format');
        if (! isset($records[$deviceId])) {
            $records[$deviceId] = [
                'deviceId' => $deviceId,
                'reason' => $reason,
                'occurrences' => 0,
                'firstTimestamp' => $timestamp,
                'lastTimestamp' => $timestamp,
                'sourceLines' => [],
                'candidateStaffIds' => $candidates,
            ];
        }
        $records[$deviceId]['occurrences']++;
        $records[$deviceId]['firstTimestamp'] = min($records[$deviceId]['firstTimestamp'], $timestamp);
        $records[$deviceId]['lastTimestamp'] = max($records[$deviceId]['lastTimestamp'], $timestamp);
        if ($sourceLine !== null) {
            $records[$deviceId]['sourceLines'][] = $sourceLine;
        }
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
