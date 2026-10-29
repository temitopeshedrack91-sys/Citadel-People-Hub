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
}
