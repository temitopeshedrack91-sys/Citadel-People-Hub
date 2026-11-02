<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProjectsAndTasksApiTest extends TestCase
{
    use RefreshDatabase;

    private Entity $entity;

    private Department $department;

    private User $user;

    private Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entity = Entity::create([
            'id' => 'entity-cgcc',
            'name' => 'Citadel Global Community Church',
            'short_code' => 'CGCC',
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'entity_id' => $this->entity->id,
            'name' => 'ICT & Technical Services',
            'code' => 'CGCC-ICT',
            'is_active' => true,
        ]);

        $this->employee = Employee::create([
            'staff_id' => 'CGCC/014',
            'full_name' => 'Bayu Wirawan',
            'first_name' => 'Bayu',
            'last_name' => 'Wirawan',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Technical Operations Lead',
            'status' => 'Active',
        ]);

        $this->user = User::create([
            'name' => 'Bayu Wirawan',
            'email' => 'bayu@citadel.ng',
            'password' => Hash::make('Password123!'),
            'role' => 'HR_STAFF',
            'staff_id' => $this->employee->staff_id,
            'is_active' => true,
        ]);
    }

    public function test_projects_and_tasks_require_authentication(): void
    {
        $this->getJson('/api/v1/projects')->assertUnauthorized();
        $this->getJson('/api/v1/tasks')->assertUnauthorized();
    }

    public function test_user_can_create_project_and_sync_members(): void
    {
        $payload = [
            'title' => 'Auditorium Audio Modernization',
            'code' => 'PRJ-2026-004',
            'description' => 'Acoustic treatment and digital console upgrade',
            'department_id' => $this->department->id,
            'status' => 'active',
            'priority' => 'high',
            'budget' => 2500000.00,
            'member_ids' => [$this->employee->id],
        ];

        $res = $this->actingAs($this->user)
            ->postJson('/api/v1/projects', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('projects', [
            'code' => 'PRJ-2026-004',
            'title' => 'Auditorium Audio Modernization',
        ]);

        $this->assertDatabaseHas('project_members', [
            'employee_id' => $this->employee->id,
        ]);
    }

    public function test_user_can_create_task_and_update_status(): void
    {
        $project = Project::create([
            'title' => 'Campus Infrastructure',
            'code' => 'PRJ-CAMPUS-01',
            'status' => 'active',
            'priority' => 'medium',
        ]);

        $payload = [
            'project_id' => $project->id,
            'department_id' => $this->department->id,
            'title' => 'Calibrate FOH line array delay zones',
            'description' => 'Verify speaker time alignment across upper and lower tiers',
            'priority' => 'urgent',
            'status' => 'todo',
            'due_date' => '2026-11-15',
            'assigned_to_employee_id' => $this->employee->id,
        ];

        $res = $this->actingAs($this->user)
            ->postJson('/api/v1/tasks', $payload)
            ->assertCreated();

        $taskId = $res->json('data.id');
        $this->assertNotNull($taskId);

        // Update task status to in_progress
        $this->actingAs($this->user)
            ->patchJson("/api/v1/tasks/{$taskId}/status", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'status' => 'in_progress',
        ]);
    }

    public function test_trellis_task_fields_persist_and_only_assignee_can_accept_assignment(): void
    {
        $assignee = Employee::create([
            'staff_id' => 'CGCC/015',
            'full_name' => 'Sinta Lubis',
            'first_name' => 'Sinta',
            'last_name' => 'Lubis',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'QA Lead',
            'status' => 'Active',
        ]);
        $otherEmployee = Employee::create([
            'staff_id' => 'CGCC/016',
            'full_name' => 'Raka Aditya',
            'first_name' => 'Raka',
            'last_name' => 'Aditya',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Data Analyst',
            'status' => 'Active',
        ]);
        $task = $this->actingAs($this->user)->postJson('/api/v1/tasks', [
            'title' => 'Verify attendance export',
            'description' => 'Confirm mapping before release.',
            'department_id' => $this->department->id,
            'priority' => 'high',
            'status' => 'todo',
            'due_date' => '2026-11-30',
            'assigned_to_employee_id' => $assignee->id,
            'reviewer_employee_id' => $otherEmployee->id,
            'labels' => ['Feature', 'High'],
            'estimated_hours' => 3.5,
            'checklist' => [['id' => 'check-1', 'text' => 'Test employee mapping', 'done' => false]],
            'pr_tag' => '#638 attendance-import',
        ])->assertCreated()
            ->assertJsonPath('data.assignment_status', 'pending')
            ->assertJsonPath('data.labels.0', 'Feature')
            ->assertJsonPath('data.estimated_hours', '3.50')
            ->assertJsonPath('data.checklist.0.text', 'Test employee mapping')
            ->assertJsonPath('data.reviewer_employee_id', $otherEmployee->id);
        $taskId = $task->json('data.id');

        $this->actingAs($this->user)->patchJson("/api/v1/tasks/{$taskId}/assignment", ['status' => 'accepted'])
            ->assertForbidden();
        $assigneeUser = User::create([
            'name' => $assignee->full_name,
            'email' => 'sinta@citadel.ng',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $assignee->staff_id,
            'department_id' => $this->department->id,
            'entity_id' => $this->entity->id,
            'is_active' => true,
        ]);
        $this->actingAs($assigneeUser)->patchJson("/api/v1/tasks/{$taskId}/assignment", ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.assignment_status', 'accepted');
        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'assignment_status' => 'accepted',
            'reviewer_employee_id' => $otherEmployee->id,
            'pr_tag' => '#638 attendance-import',
        ]);
    }

    public function test_user_can_add_comment_to_task(): void
    {
        $task = Task::create([
            'title' => 'Stage mic frequency scan',
            'priority' => 'medium',
            'status' => 'in_progress',
            'assigned_to_employee_id' => $this->employee->id,
        ]);

        $commentRes = $this->actingAs($this->user)
            ->postJson("/api/v1/tasks/{$task->id}/comments", [
                'comment' => 'RF frequency scan completed on wireless band B. Zero interference detected.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('task_comments', [
            'task_id' => $task->id,
            'employee_id' => $this->employee->id,
        ]);
    }

    public function test_employee_only_sees_and_updates_assigned_tasks(): void
    {
        $this->user->update(['role' => 'EMPLOYEE']);
        $assignedTask = Task::create([
            'title' => 'Assigned task',
            'priority' => 'medium',
            'status' => 'todo',
            'department_id' => $this->department->id,
            'assigned_to_employee_id' => $this->employee->id,
        ]);
        $otherTask = Task::create([
            'title' => 'Someone else task',
            'priority' => 'medium',
            'status' => 'todo',
            'department_id' => $this->department->id,
        ]);

        $this->actingAs($this->user)
            ->getJson('/api/v1/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $assignedTask->id);

        $this->getJson("/api/v1/tasks/{$otherTask->id}")->assertNotFound();
        $this->putJson("/api/v1/tasks/{$assignedTask->id}", ['title' => 'Forged edit'])->assertForbidden();
        $this->patchJson("/api/v1/tasks/{$assignedTask->id}/status", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');
        $this->patchJson("/api/v1/tasks/{$assignedTask->id}/checklist", [
            'checklist' => [['id' => 'check-1', 'text' => 'Confirm assigned work', 'done' => true]],
        ])->assertOk()->assertJsonPath('data.checklist.0.done', true);
        $this->assertDatabaseHas('tasks', ['id' => $assignedTask->id, 'title' => 'Assigned task', 'status' => 'in_progress']);
        $this->assertSame('Confirm assigned work', Task::findOrFail($assignedTask->id)->checklist[0]['text']);
    }

    public function test_department_head_cannot_access_or_assign_cross_entity_tasks(): void
    {
        $otherEntity = Entity::create([
            'id' => 'entity-other',
            'name' => 'Other Organization',
            'short_code' => 'OTHER',
            'is_active' => true,
        ]);
        $otherDepartment = Department::create([
            'entity_id' => $otherEntity->id,
            'name' => 'Other Department',
            'code' => 'OTHER-DEPT',
            'is_active' => true,
        ]);
        $otherEmployee = Employee::create([
            'staff_id' => 'OTHER/001',
            'full_name' => 'Other Employee',
            'first_name' => 'Other',
            'last_name' => 'Employee',
            'entity_id' => $otherEntity->id,
            'department_id' => $otherDepartment->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);
        $otherProject = Project::create([
            'title' => 'Other Organization Project',
            'code' => 'OTHER-PRJ',
            'department_id' => $otherDepartment->id,
            'status' => 'active',
            'priority' => 'medium',
        ]);
        $otherTask = Task::create([
            'title' => 'Other organization task',
            'project_id' => $otherProject->id,
            'department_id' => $otherDepartment->id,
            'priority' => 'medium',
            'status' => 'todo',
            'assigned_to_employee_id' => $otherEmployee->id,
        ]);
        $mismatchedTask = Task::create([
            'title' => 'Task with mismatched project scope',
            'project_id' => $otherProject->id,
            'department_id' => $this->department->id,
            'priority' => 'medium',
            'status' => 'todo',
        ]);
        $this->user->update([
            'role' => 'DEPARTMENT_HEAD',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->actingAs($this->user)
            ->getJson('/api/v1/tasks')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');
        $this->getJson("/api/v1/tasks/{$otherTask->id}")->assertNotFound();
        $this->getJson("/api/v1/tasks/{$mismatchedTask->id}")->assertNotFound();
        $this->getJson("/api/v1/projects/{$otherProject->id}")->assertNotFound();
        $this->postJson('/api/v1/tasks', [
            'title' => 'Cross-entity assignment',
            'project_id' => null,
            'department_id' => $this->department->id,
            'priority' => 'medium',
            'status' => 'todo',
            'assigned_to_employee_id' => $otherEmployee->id,
        ])->assertForbidden();
    }

    public function test_system_admin_projects_and_tasks_are_scoped_to_its_entity(): void
    {
        $otherEntity = Entity::create([
            'id' => 'entity-outside',
            'name' => 'Outside Organization',
            'short_code' => 'OUTSIDE',
            'is_active' => true,
        ]);
        $otherDepartment = Department::create([
            'entity_id' => $otherEntity->id,
            'name' => 'Outside Department',
            'code' => 'OUTSIDE-DEPT',
            'is_active' => true,
        ]);
        $ownProject = Project::create([
            'title' => 'In-scope Project',
            'code' => 'IN-SCOPE',
            'department_id' => $this->department->id,
            'status' => 'active',
            'priority' => 'medium',
        ]);
        $foreignProject = Project::create([
            'title' => 'Out-of-scope Project',
            'code' => 'OUT-OF-SCOPE',
            'department_id' => $otherDepartment->id,
            'status' => 'active',
            'priority' => 'medium',
        ]);
        Task::create([
            'title' => 'In-scope task',
            'project_id' => $ownProject->id,
            'department_id' => $this->department->id,
            'priority' => 'medium',
            'status' => 'todo',
        ]);
        $foreignTask = Task::create([
            'title' => 'Out-of-scope task',
            'project_id' => $foreignProject->id,
            'department_id' => $otherDepartment->id,
            'priority' => 'medium',
            'status' => 'todo',
        ]);
        $systemAdmin = User::factory()->create([
            'role' => 'SYSTEM_ADMIN',
            'entity_id' => $this->entity->id,
        ]);

        $this->actingAs($systemAdmin)
            ->getJson('/api/v1/projects')
            ->assertOk()
            ->assertJsonCount(1, 'data.data');
        $this->getJson('/api/v1/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data.data');
        $this->getJson("/api/v1/tasks/{$foreignTask->id}")->assertNotFound();

        $systemAdmin->update(['entity_id' => null]);
        $this->getJson('/api/v1/projects')->assertOk()->assertJsonCount(0, 'data.data');
        $this->getJson('/api/v1/tasks')->assertOk()->assertJsonCount(0, 'data.data');
    }
}
