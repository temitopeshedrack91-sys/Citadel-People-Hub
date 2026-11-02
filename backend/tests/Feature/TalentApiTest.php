<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\OnboardingChecklistTemplate;
use App\Models\OnboardingJourney;
use App\Models\RecruitmentRequisition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TalentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_staff_can_create_a_persisted_requisition_and_update_its_status(): void
    {
        [$entity, $department] = $this->makeOrganization('CGCC', 'People');
        $user = User::factory()->create(['role' => 'HR_STAFF']);
        $payload = $this->requisitionPayload($entity, $department);

        $created = $this->actingAs($user)->postJson('/api/v1/requisitions', $payload)
            ->assertCreated()
            ->assertJsonPath('data.jobTitle', $payload['jobTitle'])
            ->assertJsonPath('data.entityId', $entity->id)
            ->assertJsonPath('data.departmentName', $department->name)
            ->assertJsonPath('data.status', 'Open');

        $id = $created->json('data.id');
        $code = $created->json('data.requisitionCode');
        $this->assertMatchesRegularExpression('/^REQ-CGCC-\d{4}-[A-Z0-9]{6}$/', $code);
        $this->assertDatabaseHas('recruitment_requisitions', [
            'id' => $id,
            'requisition_code' => $code,
            'job_title' => $payload['jobTitle'],
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'module' => 'Recruitment',
            'record_affected_id' => $id,
            'action' => 'Created recruitment requisition',
        ]);

        $this->actingAs($user)->patchJson("/api/v1/requisitions/{$id}/status", ['status' => 'Interviewing'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Interviewing');
        $this->assertSame('Interviewing', RecruitmentRequisition::findOrFail($id)->requisition_data['status']);
    }

    public function test_department_head_can_only_create_requisitions_for_their_department(): void
    {
        [$entity, $ownDepartment] = $this->makeOrganization('CGCC', 'People');
        $otherDepartment = Department::create([
            'entity_id' => $entity->id,
            'name' => 'Technology',
            'code' => 'TECH',
            'is_active' => true,
        ]);
        $manager = User::factory()->create([
            'role' => 'DEPARTMENT_HEAD',
            'entity_id' => $entity->id,
            'department_id' => $ownDepartment->id,
        ]);

        $this->actingAs($manager)->postJson('/api/v1/requisitions', $this->requisitionPayload($entity, $otherDepartment))
            ->assertForbidden();
        $this->assertDatabaseCount('recruitment_requisitions', 0);

        $this->actingAs($manager)->postJson('/api/v1/requisitions', $this->requisitionPayload($entity, $ownDepartment))
            ->assertCreated();
    }

    public function test_business_head_cannot_read_or_create_requisitions_outside_their_entity(): void
    {
        [$ownEntity, $ownDepartment] = $this->makeOrganization('CGCC', 'People');
        [$otherEntity, $otherDepartment] = $this->makeOrganization('CSOG', 'Operations');
        $businessHead = User::factory()->create(['role' => 'BUSINESS_HEAD', 'entity_id' => $ownEntity->id]);
        $outside = RecruitmentRequisition::create([
            'requisition_code' => 'REQ-CSOG-2026-EXIST01',
            'job_title' => 'Operations Lead',
            'entity_id' => $otherEntity->id,
            'department_id' => $otherDepartment->id,
            'requisition_data' => ['status' => 'Open'],
        ]);

        $this->actingAs($businessHead)->getJson('/api/v1/requisitions')
            ->assertOk()
            ->assertJsonMissingPath('data.0.id');
        $this->actingAs($businessHead)->postJson('/api/v1/requisitions', $this->requisitionPayload($otherEntity, $otherDepartment))
            ->assertForbidden();
        $this->assertDatabaseHas('recruitment_requisitions', ['id' => $outside->id]);
    }

    public function test_employee_and_viewer_cannot_access_talent_management_routes(): void
    {
        foreach (['EMPLOYEE', 'VIEWER'] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/v1/requisitions')->assertForbidden();
            $this->actingAs($user)->postJson('/api/v1/requisitions', [])->assertForbidden();
        }
    }

    public function test_hr_can_persist_a_checklist_and_employee_linked_onboarding_workflow(): void
    {
        [$entity, $department] = $this->makeOrganization('CGCC', 'People');
        $employee = Employee::create([
            'staff_id' => 'CGCC-ONB-01',
            'full_name' => 'Amina Example',
            'first_name' => 'Amina',
            'last_name' => 'Example',
            'entity_id' => $entity->id,
            'department_id' => $department->id,
            'job_title' => 'HR Analyst',
            'manager_name' => 'People Manager',
            'status' => 'Active',
        ]);
        $user = User::factory()->create(['role' => 'HR_STAFF']);
        $task = [
            'title' => 'Confirm workstation access',
            'description' => 'Verify issued access with the employee.',
            'department' => 'IT',
            'timeline' => 'Day 1',
            'assignedRole' => 'ICT',
            'dueDate' => 'Day 1',
        ];

        $createdTemplate = $this->actingAs($user)->postJson('/api/v1/checklist-templates', [
            'title' => 'Operations induction',
            'category' => 'General',
            'targetAudience' => 'Operations staff',
            'duration' => '1 Month',
            'description' => 'Induction checklist for operations staff.',
            'tasks' => [$task],
        ])->assertCreated()
            ->assertJsonPath('data.taskCount', 1)
            ->assertJsonPath('data.tasks.0.title', $task['title']);
        $templateId = $createdTemplate->json('data.id');
        $this->assertDatabaseHas('onboarding_checklist_templates', ['id' => $templateId, 'title' => 'Operations induction']);

        $journey = $this->postJson('/api/v1/onboarding-journeys', [
            'employeeId' => $employee->id,
            'checklistId' => $templateId,
            'startDate' => '2026-11-02',
        ])->assertCreated()
            ->assertJsonPath('data.employeeId', (string) $employee->id)
            ->assertJsonPath('data.employeeName', 'Amina Example')
            ->assertJsonPath('data.tasks.0.isCompleted', false);
        $journeyId = $journey->json('data.id');
        $taskId = $journey->json('data.tasks.0.id');
        $this->assertDatabaseHas('onboarding_journeys', [
            'id' => $journeyId,
            'employee_record_id' => $employee->id,
        ]);

        $this->patchJson("/api/v1/onboarding-journeys/{$journeyId}/tasks/{$taskId}", ['isCompleted' => true])
            ->assertOk()
            ->assertJsonPath('data.overallProgressPercent', 100)
            ->assertJsonPath('data.tasks.0.isCompleted', true);
        $this->postJson("/api/v1/onboarding-journeys/{$journeyId}/tasks", [
            ...$task,
            'isConditional' => false,
        ])->assertCreated()->assertJsonPath('data.overallProgressPercent', 50);
        $persistedJourney = OnboardingJourney::findOrFail($journeyId);
        $journeyData = $persistedJourney->journey_data;
        $journeyData['requiredDocuments'] = [['id' => 'doc-1', 'name' => 'ID copy', 'isSubmitted' => false]];
        $journeyData['orientationItems'] = [['id' => 'ori-1', 'name' => 'Workplace tour', 'isCompleted' => false]];
        $persistedJourney->update(['journey_data' => $journeyData]);
        $this->patchJson("/api/v1/onboarding-journeys/{$journeyId}/documents/doc-1", ['isSubmitted' => true])
            ->assertOk()->assertJsonPath('data.requiredDocuments.0.isSubmitted', true);
        $this->patchJson("/api/v1/onboarding-journeys/{$journeyId}/orientation/ori-1", ['isCompleted' => true])
            ->assertOk()->assertJsonPath('data.orientationItems.0.isCompleted', true);
        $this->assertDatabaseHas('audit_logs', [
            'module' => 'Talent & Onboarding',
            'record_affected_id' => $journeyId,
            'action' => 'Created onboarding task',
        ]);

        $this->assertCount(1, OnboardingChecklistTemplate::query()->get());
        $this->assertSame((string) $employee->id, OnboardingJourney::findOrFail($journeyId)->journey_data['employeeId']);
    }

    public function test_department_head_cannot_view_or_mutate_onboarding_outside_their_department(): void
    {
        [$entity, $department] = $this->makeOrganization('CGCC', 'People');
        $otherDepartment = Department::create([
            'entity_id' => $entity->id,
            'name' => 'Technology',
            'code' => 'TECH',
            'is_active' => true,
        ]);
        $employee = Employee::create([
            'staff_id' => 'CGCC-ONB-02',
            'full_name' => 'Kola Example',
            'first_name' => 'Kola',
            'last_name' => 'Example',
            'entity_id' => $entity->id,
            'department_id' => $otherDepartment->id,
            'job_title' => 'Engineer',
            'status' => 'Active',
        ]);
        $template = OnboardingChecklistTemplate::create([
            'title' => 'Engineering induction',
            'category' => 'General',
            'target_audience' => 'Engineering staff',
            'duration' => '1 Month',
            'description' => '',
            'task_data' => [],
        ]);
        $journey = OnboardingJourney::create([
            'employee_record_id' => $employee->id,
            'journey_data' => [
                'employeeId' => (string) $employee->id,
                'employeeName' => $employee->full_name,
                'status' => 'In Progress',
                'tasks' => [['id' => 'task-1', 'title' => 'Task', 'isCompleted' => false]],
            ],
        ]);
        $manager = User::factory()->create([
            'role' => 'DEPARTMENT_HEAD',
            'entity_id' => $entity->id,
            'department_id' => $department->id,
        ]);

        $this->actingAs($manager)->getJson('/api/v1/onboarding-journeys')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($manager)->patchJson("/api/v1/onboarding-journeys/{$journey->id}/tasks/task-1", ['isCompleted' => true])
            ->assertNotFound();
        $this->actingAs($manager)->postJson('/api/v1/onboarding-journeys', [
            'employeeId' => $employee->id,
            'checklistId' => $template->id,
            'startDate' => '2026-11-02',
        ])->assertForbidden();
    }

    private function makeOrganization(string $shortCode, string $departmentName): array
    {
        $entity = Entity::create([
            'id' => strtolower("entity-{$shortCode}"),
            'name' => "Citadel {$shortCode}",
            'short_code' => $shortCode,
            'is_active' => true,
        ]);
        $department = Department::create([
            'entity_id' => $entity->id,
            'name' => $departmentName,
            'code' => strtoupper(substr($departmentName, 0, 4)),
            'is_active' => true,
        ]);

        return [$entity, $department];
    }

    private function requisitionPayload(Entity $entity, Department $department): array
    {
        return [
            'jobTitle' => 'Senior Operations Engineer',
            'entityId' => $entity->id,
            'departmentId' => $department->id,
            'openPositions' => 2,
            'employmentType' => 'Full-Time',
            'targetDate' => '2026-12-15',
            'hiringManager' => 'Department Manager',
            'workLocation' => 'On-site',
            'salaryBand' => 'Approved Grade 4',
            'justification' => 'Approved headcount',
        ];
    }
}
