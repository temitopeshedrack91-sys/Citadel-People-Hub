<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\CandidateHistory;
use App\Models\CandidateInterview;
use App\Models\JobVacancy;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Manages Applicant Tracking System (ATS), Job Vacancies, Candidate Pipelines, and Interviews.
 * Replicates the Candidate state transitions and Interview scheduling of OrangeHRM Recruitment Plugin.
 */
class RecruitmentPipelineController extends Controller
{
    public const VALID_STATUSES = [
        'Application Initiated',
        'Shortlisted',
        'Interview Scheduled',
        'Interview Passed',
        'Interview Failed',
        'Job Offered',
        'Offer Accepted',
        'Offer Declined',
        'Rejected',
        'Hired',
    ];

    // ==========================================
    // Job Vacancies
    // ==========================================

    public function vacancies(Request $request): JsonResponse
    {
        $query = JobVacancy::query()->with(['jobTitle', 'department', 'hiringManager']);
        if ($request->boolean('activeOnly', true)) {
            $query->where('status', 'Active');
        }
        if ($request->filled('departmentId')) {
            $query->where('department_id', $request->input('departmentId'));
        }

        return response()->json([
            'data' => $query->latest()->get()->map(fn (JobVacancy $v) => [
                'id' => $v->id,
                'requisitionId' => $v->requisition_id,
                'title' => $v->title,
                'jobTitleId' => $v->job_title_id,
                'jobTitleName' => $v->jobTitle?->title,
                'departmentId' => $v->department_id,
                'departmentName' => $v->department?->name,
                'hiringManagerId' => $v->hiring_manager_id,
                'hiringManagerName' => $v->hiringManager?->full_name,
                'positionsCount' => $v->positions_count,
                'description' => $v->description,
                'status' => $v->status,
                'candidateCount' => $v->candidates()->count(),
                'createdAt' => $v->created_at->toISOString(),
            ]),
        ]);
    }

    public function storeVacancy(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'requisitionId' => ['nullable', 'exists:recruitment_requisitions,id'],
            'title' => ['required', 'string', 'max:180'],
            'jobTitleId' => ['nullable', 'exists:job_titles,id'],
            'departmentId' => ['nullable', 'exists:departments,id'],
            'hiringManagerId' => ['nullable', 'exists:employees,id'],
            'positionsCount' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'description' => ['nullable', 'string', 'max:4000'],
            'status' => ['sometimes', Rule::in(['Active', 'Closed', 'On Hold'])],
        ]);

        $vacancy = DB::transaction(function () use ($request, $data) {
            $vacancy = JobVacancy::create([
                'requisition_id' => $data['requisitionId'] ?? null,
                'title' => $data['title'],
                'job_title_id' => $data['jobTitleId'] ?? null,
                'department_id' => $data['departmentId'] ?? null,
                'hiring_manager_id' => $data['hiringManagerId'] ?? null,
                'positions_count' => $data['positionsCount'] ?? 1,
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? 'Active',
            ]);

            AuditLogger::record($request, 'Recruitment', 'Created Job Vacancy', (string) $vacancy->id, $vacancy->title, null, 'Active');

            return $vacancy;
        });

        return response()->json(['data' => $vacancy->load(['jobTitle', 'department', 'hiringManager'])], 201);
    }

    public function updateVacancy(Request $request, JobVacancy $jobVacancy): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:180'],
            'jobTitleId' => ['nullable', 'exists:job_titles,id'],
            'departmentId' => ['nullable', 'exists:departments,id'],
            'hiringManagerId' => ['nullable', 'exists:employees,id'],
            'positionsCount' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'description' => ['nullable', 'string', 'max:4000'],
            'status' => ['sometimes', Rule::in(['Active', 'Closed', 'On Hold'])],
        ]);

        $jobVacancy = DB::transaction(function () use ($request, $jobVacancy, $data) {
            $previousStatus = $jobVacancy->status;
            $jobVacancy->update([
                'title' => $data['title'] ?? $jobVacancy->title,
                'job_title_id' => array_key_exists('jobTitleId', $data) ? $data['jobTitleId'] : $jobVacancy->job_title_id,
                'department_id' => array_key_exists('departmentId', $data) ? $data['departmentId'] : $jobVacancy->department_id,
                'hiring_manager_id' => array_key_exists('hiringManagerId', $data) ? $data['hiringManagerId'] : $jobVacancy->hiring_manager_id,
                'positions_count' => $data['positionsCount'] ?? $jobVacancy->positions_count,
                'description' => array_key_exists('description', $data) ? $data['description'] : $jobVacancy->description,
                'status' => $data['status'] ?? $jobVacancy->status,
            ]);

            AuditLogger::record($request, 'Recruitment', 'Updated Job Vacancy', (string) $jobVacancy->id, $jobVacancy->title, $previousStatus, $jobVacancy->status);

            return $jobVacancy;
        });

        return response()->json(['data' => $jobVacancy->load(['jobTitle', 'department', 'hiringManager'])]);
    }

    // ==========================================
    // Candidates & Pipeline
    // ==========================================

    public function candidates(Request $request): JsonResponse
    {
        $query = Candidate::query()->with(['vacancy.department', 'interviews.interviewer']);

        if ($request->filled('vacancyId')) {
            $query->where('vacancy_id', $request->input('vacancyId'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json([
            'data' => $query->latest('applied_date')->limit(300)->get()->map(fn (Candidate $c) => $this->presentCandidate($c)),
        ]);
    }

    public function showCandidate(Candidate $candidate): JsonResponse
    {
        return response()->json([
            'data' => $this->presentCandidate($candidate->load(['vacancy.department', 'interviews.interviewer', 'histories.performer'])),
        ]);
    }

    public function storeCandidate(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'vacancyId' => ['required', 'exists:job_vacancies,id'],
            'firstName' => ['required', 'string', 'max:80'],
            'lastName' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'resumeUrl' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'appliedDate' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        $candidate = DB::transaction(function () use ($request, $data) {
            $user = $request->user();
            $candidate = Candidate::create([
                'vacancy_id' => $data['vacancyId'],
                'first_name' => $data['firstName'],
                'last_name' => $data['lastName'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'resume_url' => $data['resumeUrl'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'Application Initiated',
                'applied_date' => $data['appliedDate'] ?? now()->format('Y-m-d'),
            ]);

            CandidateHistory::create([
                'candidate_id' => $candidate->id,
                'action' => 'APPLICATION INITIATED',
                'performed_by' => $user->id,
                'notes' => 'Candidate application registered in system.',
            ]);

            AuditLogger::record($request, 'Recruitment', 'Added Candidate', (string) $candidate->id, $candidate->full_name, null, 'Application Initiated');

            return $candidate;
        });

        return response()->json(['data' => $this->presentCandidate($candidate->load('vacancy'))], 201);
    }

    public function updateCandidateStatus(Request $request, Candidate $candidate): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'status' => ['required', Rule::in(self::VALID_STATUSES)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $newStatus = $data['status'];
        $currentStatus = $candidate->status;

        // OrangeHRM WorkflowStateMachine transition rules
        $allowedTransitions = [
            'Application Initiated' => ['Shortlisted', 'Rejected'],
            'Shortlisted' => ['Interview Scheduled', 'Rejected'],
            'Interview Scheduled' => ['Interview Passed', 'Interview Failed', 'Rejected'],
            'Interview Passed' => ['Job Offered', 'Interview Scheduled', 'Rejected'],
            'Interview Failed' => ['Rejected', 'Interview Scheduled'],
            'Job Offered' => ['Offer Accepted', 'Offer Declined', 'Rejected'],
            'Offer Accepted' => ['Hired', 'Rejected'],
            'Offer Declined' => ['Rejected'],
            'Rejected' => ['Application Initiated', 'Shortlisted'], // Can reopen
            'Hired' => [],
        ];

        if (! in_array($newStatus, $allowedTransitions[$currentStatus] ?? [], true) && $newStatus !== $currentStatus) {
            abort(422, "Cannot transition candidate from '{$currentStatus}' to '{$newStatus}'.");
        }

        $candidate = DB::transaction(function () use ($request, $candidate, $newStatus, $data, $currentStatus) {
            $user = $request->user();
            $candidate->update([
                'status' => $newStatus,
            ]);

            CandidateHistory::create([
                'candidate_id' => $candidate->id,
                'action' => strtoupper($newStatus),
                'performed_by' => $user->id,
                'notes' => $data['notes'] ?? null,
            ]);

            AuditLogger::record($request, 'Recruitment', "Candidate {$newStatus}", (string) $candidate->id, $candidate->full_name, $currentStatus, $newStatus);

            return $candidate;
        });

        return response()->json(['data' => $this->presentCandidate($candidate->load(['vacancy', 'histories.performer', 'interviews']))]);
    }

    public function scheduleInterview(Request $request, Candidate $candidate): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'interviewTitle' => ['required', 'string', 'max:180'],
            'interviewerId' => ['nullable', 'exists:employees,id'],
            'scheduledDate' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'scheduledTime' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $interview = DB::transaction(function () use ($request, $candidate, $data) {
            $user = $request->user();

            $interview = CandidateInterview::create([
                'candidate_id' => $candidate->id,
                'interview_title' => $data['interviewTitle'],
                'interviewer_id' => $data['interviewerId'] ?? null,
                'scheduled_date' => $data['scheduledDate'],
                'scheduled_time' => $data['scheduledTime'] ?? null,
                'notes' => $data['notes'] ?? null,
                'result' => 'Pending',
            ]);

            $candidate->update(['status' => 'Interview Scheduled']);

            CandidateHistory::create([
                'candidate_id' => $candidate->id,
                'action' => 'INTERVIEW SCHEDULED',
                'performed_by' => $user->id,
                'notes' => "Interview scheduled for {$data['scheduledDate']}: {$data['interviewTitle']}",
            ]);

            AuditLogger::record($request, 'Recruitment', 'Scheduled Interview', (string) $interview->id, "{$data['interviewTitle']} for {$candidate->full_name}", null, 'Pending');

            return $interview;
        });

        return response()->json(['data' => $interview->load('interviewer')], 201);
    }

    public function updateInterviewResult(Request $request, CandidateInterview $candidateInterview): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'result' => ['required', Rule::in(['Passed', 'Failed'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = DB::transaction(function () use ($request, $candidateInterview, $data) {
            $user = $request->user();
            $candidateInterview->update([
                'result' => $data['result'],
                'notes' => $data['notes'] ?? $candidateInterview->notes,
            ]);

            $candidate = $candidateInterview->candidate;
            $newStatus = $data['result'] === 'Passed' ? 'Interview Passed' : 'Interview Failed';
            $candidate->update(['status' => $newStatus]);

            CandidateHistory::create([
                'candidate_id' => $candidate->id,
                'action' => strtoupper($newStatus),
                'performed_by' => $user->id,
                'notes' => "Interview '{$candidateInterview->interview_title}' marked as {$data['result']}.",
            ]);

            AuditLogger::record($request, 'Recruitment', "Interview {$data['result']}", (string) $candidateInterview->id, $candidateInterview->interview_title, 'Pending', $data['result']);

            return $candidateInterview;
        });

        return response()->json(['data' => $updated->load(['candidate', 'interviewer'])]);
    }

    private function authorizeAdminOrHr(Request $request): void
    {
        $role = RoleAuthorization::canonical($request->user()->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF'], true), 403, 'Unauthorized.');
    }

    private function presentCandidate(Candidate $c): array
    {
        return [
            'id' => $c->id,
            'vacancyId' => $c->vacancy_id,
            'vacancyTitle' => $c->vacancy?->title,
            'departmentName' => $c->vacancy?->department?->name,
            'firstName' => $c->first_name,
            'lastName' => $c->last_name,
            'fullName' => $c->full_name,
            'email' => $c->email,
            'phone' => $c->phone,
            'resumeUrl' => $c->resume_url,
            'status' => $c->status,
            'notes' => $c->notes,
            'appliedDate' => $c->applied_date->format('Y-m-d'),
            'interviews' => $c->relationLoaded('interviews') ? $c->interviews->map(fn (CandidateInterview $i) => [
                'id' => $i->id,
                'title' => $i->interview_title,
                'interviewerName' => $i->interviewer?->full_name,
                'scheduledDate' => $i->scheduled_date->format('Y-m-d'),
                'scheduledTime' => $i->scheduled_time,
                'result' => $i->result,
                'notes' => $i->notes,
            ]) : [],
            'histories' => $c->relationLoaded('histories') ? $c->histories->map(fn (CandidateHistory $h) => [
                'id' => $h->id,
                'action' => $h->action,
                'performer' => $h->performer?->name,
                'notes' => $h->notes,
                'timestamp' => $h->created_at->toISOString(),
            ]) : [],
        ];
    }
}
