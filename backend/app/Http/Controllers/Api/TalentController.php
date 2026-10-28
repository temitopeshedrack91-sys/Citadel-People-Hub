<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnboardingJourney;
use App\Models\RecruitmentRequisition;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TalentController extends Controller
{
    public function journeys(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['PCCM_SUPER_ADMIN', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD'], true), 403);

        $query = OnboardingJourney::query();
        if ($request->user()->role === 'BUSINESS_HEAD') {
            $query->whereHas('employee', fn ($employees) => $employees->where('entity_id', $request->user()->entity_id));
        } elseif ($request->user()->role === 'DEPARTMENT_HEAD') {
            $query->whereHas('employee', fn ($employees) => $employees->where('department_id', $request->user()->department_id));
        }

        return response()->json(['data' => $query->latest()->limit(200)->get()->map(fn (OnboardingJourney $journey) => array_merge($journey->journey_data, ['id' => $journey->id]))]);
    }

    public function updateTask(Request $request, OnboardingJourney $journey, string $taskId): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['PCCM_SUPER_ADMIN', 'DEPARTMENT_HEAD'], true), 403);
        $data = $request->validate(['isCompleted' => ['required', 'boolean']]);
        $journeyData = DB::transaction(function () use ($request, $journey, $taskId, $data) {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);
            if ($request->user()->role === 'DEPARTMENT_HEAD') {
                abort_unless(
                    $lockedJourney->employee && $lockedJourney->employee->department_id === $request->user()->department_id,
                    403,
                    'You can only update onboarding tasks for your department.'
                );
            }
            $journeyData = $lockedJourney->journey_data;
            $found = false;
            foreach ($journeyData['tasks'] ?? [] as $index => $task) {
                if (($task['id'] ?? null) === $taskId) {
                    $journeyData['tasks'][$index]['isCompleted'] = $data['isCompleted'];
                    $journeyData['tasks'][$index]['completedAt'] = $data['isCompleted'] ? now()->toISOString() : null;
                    $found = true;
                    break;
                }
            }
            abort_unless($found, 404, 'Onboarding task not found.');
            $tasks = $journeyData['tasks'];
            $journeyData['overallProgressPercent'] = count($tasks) > 0
                ? (int) round(collect($tasks)->where('isCompleted', true)->count() * 100 / count($tasks))
                : 0;
            $lockedJourney->update(['journey_data' => $journeyData]);
            AuditLogger::record($request, 'Talent & Onboarding', 'Updated onboarding task', $lockedJourney->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, $data['isCompleted'] ? 'Completed' : 'Pending');

            return $journeyData;
        });

        return response()->json(['data' => array_merge($journeyData, ['id' => $journey->id])]);
    }

    public function requisitions(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['PCCM_SUPER_ADMIN', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD'], true), 403);

        $query = RecruitmentRequisition::query();
        if ($request->user()->role === 'BUSINESS_HEAD') {
            $query->where('entity_id', $request->user()->entity_id);
        } elseif ($request->user()->role === 'DEPARTMENT_HEAD') {
            $query->where('department_id', $request->user()->department_id);
        }

        return response()->json(['data' => $query->latest()->limit(200)->get()->map(fn (RecruitmentRequisition $requisition) => array_merge(
            $requisition->requisition_data,
            ['id' => $requisition->id, 'requisitionCode' => $requisition->requisition_code, 'jobTitle' => $requisition->job_title]
        ))]);
    }
}
