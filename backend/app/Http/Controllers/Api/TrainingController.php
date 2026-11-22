<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeTraining;
use App\Models\TrainingCourse;
use App\Models\TrainingSession;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Manages corporate training courses, training sessions, and employee learning completions.
 */
class TrainingController extends Controller
{
    // ==========================================
    // Training Courses
    // ==========================================

    public function courses(Request $request): JsonResponse
    {
        $query = TrainingCourse::query()->withCount('sessions')->orderBy('title');
        if ($request->boolean('activeOnly', true)) {
            $query->where('is_active', true);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function storeCourse(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'code' => ['required', 'string', 'max:40', 'unique:training_courses,code'],
            'description' => ['nullable', 'string', 'max:3000'],
            'trainerProvider' => ['nullable', 'string', 'max:180'],
            'durationHours' => ['sometimes', 'numeric', 'min:0.5', 'max:500'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $course = DB::transaction(function () use ($request, $data) {
            $course = TrainingCourse::create([
                'title' => $data['title'],
                'code' => strtoupper($data['code']),
                'description' => $data['description'] ?? null,
                'trainer_provider' => $data['trainerProvider'] ?? null,
                'duration_hours' => $data['durationHours'] ?? 0,
                'is_active' => $data['isActive'] ?? true,
            ]);

            AuditLogger::record($request, 'Training', 'Created Course', (string) $course->id, $course->title, null, 'Active');

            return $course;
        });

        return response()->json(['data' => $course], 201);
    }

    public function updateCourse(Request $request, TrainingCourse $trainingCourse): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:180'],
            'code' => ['sometimes', 'string', 'max:40', Rule::unique('training_courses', 'code')->ignore($trainingCourse->id)],
            'description' => ['nullable', 'string', 'max:3000'],
            'trainerProvider' => ['nullable', 'string', 'max:180'],
            'durationHours' => ['sometimes', 'numeric', 'min:0.5', 'max:500'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $updated = DB::transaction(function () use ($request, $trainingCourse, $data) {
            $trainingCourse->update([
                'title' => $data['title'] ?? $trainingCourse->title,
                'code' => isset($data['code']) ? strtoupper($data['code']) : $trainingCourse->code,
                'description' => array_key_exists('description', $data) ? $data['description'] : $trainingCourse->description,
                'trainer_provider' => array_key_exists('trainerProvider', $data) ? $data['trainerProvider'] : $trainingCourse->trainer_provider,
                'duration_hours' => $data['durationHours'] ?? $trainingCourse->duration_hours,
                'is_active' => $data['isActive'] ?? $trainingCourse->is_active,
            ]);

            AuditLogger::record($request, 'Training', 'Updated Course', (string) $trainingCourse->id, $trainingCourse->title, null, 'Updated');

            return $trainingCourse;
        });

        return response()->json(['data' => $updated]);
    }

    // ==========================================
    // Training Sessions
    // ==========================================

    public function sessions(Request $request): JsonResponse
    {
        $query = TrainingSession::query()->with(['course', 'enrollments.employee:id,staff_id,full_name']);
        if ($request->filled('courseId')) {
            $query->where('course_id', $request->input('courseId'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json([
            'data' => $query->latest('start_date')->get()->map(fn (TrainingSession $s) => [
                'id' => $s->id,
                'courseId' => $s->course_id,
                'courseTitle' => $s->course?->title,
                'sessionName' => $s->session_name,
                'startDate' => $s->start_date->format('Y-m-d'),
                'endDate' => $s->end_date->format('Y-m-d'),
                'deliveryMethod' => $s->delivery_method,
                'locationOrUrl' => $s->location_or_url,
                'maxCapacity' => $s->max_capacity,
                'enrolledCount' => $s->enrollments->count(),
                'status' => $s->status,
                'enrollments' => $s->enrollments->map(fn (EmployeeTraining $e) => [
                    'id' => $e->id,
                    'employeeId' => $e->employee_id,
                    'employeeName' => $e->employee?->full_name,
                    'employeeStaffId' => $e->employee?->staff_id,
                    'status' => $e->status,
                    'completionDate' => $e->completion_date?->format('Y-m-d'),
                    'score' => $e->score !== null ? (float) $e->score : null,
                    'feedback' => $e->feedback,
                ]),
            ]),
        ]);
    }

    public function storeSession(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'courseId' => ['required', 'exists:training_courses,id'],
            'sessionName' => ['required', 'string', 'max:180'],
            'startDate' => ['required', 'date_format:Y-m-d'],
            'endDate' => ['required', 'date_format:Y-m-d', 'after_or_equal:startDate'],
            'deliveryMethod' => ['sometimes', Rule::in(['In-Person', 'Online', 'Hybrid'])],
            'locationOrUrl' => ['nullable', 'string', 'max:255'],
            'maxCapacity' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'status' => ['sometimes', Rule::in(['Scheduled', 'In Progress', 'Completed', 'Cancelled'])],
        ]);

        $session = DB::transaction(function () use ($request, $data) {
            $session = TrainingSession::create([
                'course_id' => $data['courseId'],
                'session_name' => $data['sessionName'],
                'start_date' => $data['startDate'],
                'end_date' => $data['endDate'],
                'delivery_method' => $data['deliveryMethod'] ?? 'In-Person',
                'location_or_url' => $data['locationOrUrl'] ?? null,
                'max_capacity' => $data['maxCapacity'] ?? 25,
                'status' => $data['status'] ?? 'Scheduled',
            ]);

            AuditLogger::record($request, 'Training', 'Scheduled Session', (string) $session->id, $session->session_name, null, 'Scheduled');

            return $session;
        });

        return response()->json(['data' => $session->load('course')], 201);
    }

    // ==========================================
    // Employee Enrollments
    // ==========================================

    public function enrollEmployee(Request $request, TrainingSession $trainingSession): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
        ]);

        $enrollment = DB::transaction(function () use ($request, $trainingSession, $data) {
            if ($trainingSession->enrollments()->count() >= $trainingSession->max_capacity) {
                abort(422, 'This training session has reached maximum attendee capacity.');
            }

            $alreadyEnrolled = EmployeeTraining::query()
                ->where('session_id', $trainingSession->id)
                ->where('employee_id', $data['employeeId'])
                ->exists();

            if ($alreadyEnrolled) {
                abort(409, 'Employee is already enrolled in this training session.');
            }

            $enrollment = EmployeeTraining::create([
                'session_id' => $trainingSession->id,
                'employee_id' => $data['employeeId'],
                'status' => 'Enrolled',
            ]);

            $employee = Employee::query()->find($data['employeeId']);
            AuditLogger::record($request, 'Training', 'Enrolled Employee', (string) $enrollment->id, "{$employee?->full_name} in {$trainingSession->session_name}", null, 'Enrolled');

            return $enrollment;
        });

        return response()->json(['data' => $enrollment->load(['session.course', 'employee'])], 201);
    }

    public function updateEmployeeTraining(Request $request, EmployeeTraining $employeeTraining): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'status' => ['required', Rule::in(['Enrolled', 'Attended', 'Completed', 'Incomplete'])],
            'completionDate' => ['nullable', 'date_format:Y-m-d'],
            'score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = DB::transaction(function () use ($request, $employeeTraining, $data) {
            $previousStatus = $employeeTraining->status;
            $employeeTraining->update([
                'status' => $data['status'],
                'completion_date' => $data['completionDate'] ?? ($data['status'] === 'Completed' ? now()->format('Y-m-d') : null),
                'score' => $data['score'] ?? $employeeTraining->score,
                'feedback' => $data['feedback'] ?? $employeeTraining->feedback,
            ]);

            AuditLogger::record($request, 'Training', "Training {$data['status']}", (string) $employeeTraining->id, "Record #{$employeeTraining->id}", $previousStatus, $data['status']);

            return $employeeTraining;
        });

        return response()->json(['data' => $updated->load(['session.course', 'employee'])]);
    }

    private function authorizeAdminOrHr(Request $request): void
    {
        $role = RoleAuthorization::canonical($request->user()->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF'], true), 403, 'Unauthorized.');
    }
}
