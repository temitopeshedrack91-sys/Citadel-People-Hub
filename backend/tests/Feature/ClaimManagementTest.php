<?php

namespace Tests\Feature;

use App\Models\ClaimEvent;
use App\Models\ClaimExpense;
use App\Models\ClaimRequest;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\ExpenseType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for Employee Claims & Expense Reimbursements (ported from OrangeHRM Claim Plugin).
 */
class ClaimManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private User $hrUser;
    private User $staffUser;
    private User $otherStaffUser;
    private Entity $entity;
    private Department $department;
    private Employee $staffEmployee;
    private Employee $otherStaffEmployee;
    private ClaimEvent $claimEvent;
    private ExpenseType $travelExpenseType;
    private ExpenseType $mealExpenseType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entity = Entity::create([
            'id' => 'CORP',
            'name' => 'Citadel Global Corporation',
            'short_code' => 'CGC',
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'entity_id' => $this->entity->id,
            'name' => 'Finance & Operations',
            'code' => 'FIN',
            'is_active' => true,
        ]);

        $this->adminUser = User::factory()->create([
            'email' => 'admin@citadel.test',
            'role' => 'ADMIN',
            'staff_id' => 'ADM001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->hrUser = User::factory()->create([
            'email' => 'hr@citadel.test',
            'role' => 'HR_MANAGER',
            'staff_id' => 'HR001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->staffUser = User::factory()->create([
            'email' => 'staff@citadel.test',
            'role' => 'EMPLOYEE',
            'staff_id' => 'STF001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->otherStaffUser = User::factory()->create([
            'email' => 'other@citadel.test',
            'role' => 'EMPLOYEE',
            'staff_id' => 'STF002',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->staffEmployee = Employee::create([
            'staff_id' => 'STF001',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'full_name' => 'Jane Doe',
            'email' => 'staff@citadel.test',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Project Coordinator',
            'status' => 'Active',
        ]);

        $this->otherStaffEmployee = Employee::create([
            'staff_id' => 'STF002',
            'first_name' => 'John',
            'last_name' => 'Smith',
            'full_name' => 'John Smith',
            'email' => 'other@citadel.test',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Operations Analyst',
            'status' => 'Active',
        ]);

        $this->claimEvent = ClaimEvent::create([
            'name' => 'Annual Strategy Conference',
            'code' => 'CONF-2026',
            'description' => 'Travel & conference attendance expenses',
            'status' => 'Active',
            'is_active' => true,
        ]);

        $this->travelExpenseType = ExpenseType::create([
            'name' => 'Interstate Flight / Transit',
            'code' => 'EXP-TRV',
            'description' => 'Flight and ground transportation',
            'status' => 'Active',
            'is_active' => true,
        ]);

        $this->mealExpenseType = ExpenseType::create([
            'name' => 'Per Diem Meals',
            'code' => 'EXP-MEAL',
            'description' => 'Subsistence meals during official duty',
            'status' => 'Active',
            'is_active' => true,
        ]);
    }

    // ==========================================
    // 1. Claim Events & Expense Types Configuration
    // ==========================================

    public function test_admin_and_hr_can_create_events_and_expense_types(): void
    {
        // Admin creates event
        $resEvent = $this->actingAs($this->adminUser)->postJson('/api/v1/claims/events', [
            'name' => 'Q4 Regional Summit',
            'code' => 'SUMMIT-Q4',
            'description' => 'Regional team summit logistics',
        ]);
        $resEvent->assertStatus(201)
            ->assertJsonPath('data.name', 'Q4 Regional Summit')
            ->assertJsonPath('data.code', 'SUMMIT-Q4');

        // HR creates expense type
        $resType = $this->actingAs($this->hrUser)->postJson('/api/v1/claims/expense-types', [
            'name' => 'Hotel Accommodation',
            'code' => 'EXP-HOTEL',
            'description' => 'Approved lodging costs',
        ]);
        $resType->assertStatus(201)
            ->assertJsonPath('data.name', 'Hotel Accommodation');
    }

    public function test_regular_employee_forbidden_from_creating_events_or_types(): void
    {
        $resEvent = $this->actingAs($this->staffUser)->postJson('/api/v1/claims/events', [
            'name' => 'Unauthorized Event',
        ]);
        $resEvent->assertStatus(403);

        $resType = $this->actingAs($this->staffUser)->postJson('/api/v1/claims/expense-types', [
            'name' => 'Unauthorized Type',
        ]);
        $resType->assertStatus(403);
    }

    // ==========================================
    // 2. Claim Request Creation & Total Recalculation
    // ==========================================

    public function test_employee_can_submit_claim_request_with_line_items_and_recalculate_total(): void
    {
        $response = $this->actingAs($this->staffUser)->postJson('/api/v1/claims', [
            'claim_event_id' => $this->claimEvent->id,
            'description' => 'Trip to Abuja branch office',
            'remarks' => 'All receipts attached',
            'status' => 'SUBMITTED',
            'expenses' => [
                [
                    'expense_type_id' => $this->travelExpenseType->id,
                    'expense_date' => '2026-11-20',
                    'amount' => 45000.00,
                    'note' => 'Flight ticket',
                ],
                [
                    'expense_type_id' => $this->mealExpenseType->id,
                    'expense_date' => '2026-11-21',
                    'amount' => 12500.50,
                    'note' => 'Meals allowance',
                ],
            ],
        ]);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals($this->staffEmployee->id, $data['employee_id']);
        $this->assertStringStartsWith('CLM-2026-', $data['claim_number']);
        $this->assertEquals('SUBMITTED', $data['status']);
        $this->assertEquals(57500.50, (float) $data['total_amount']);
        $this->assertCount(2, $data['expenses']);
    }

    public function test_adding_and_removing_claim_expenses_updates_total_dynamically(): void
    {
        // 1. Create claim with single expense
        $claim = ClaimRequest::create([
            'claim_number' => 'CLM-2026-9001',
            'employee_id' => $this->staffEmployee->id,
            'claim_event_id' => $this->claimEvent->id,
            'currency' => 'NGN',
            'status' => ClaimRequest::STATUS_INITIATED,
            'total_amount' => 20000.00,
        ]);

        $exp1 = ClaimExpense::create([
            'claim_request_id' => $claim->id,
            'expense_type_id' => $this->travelExpenseType->id,
            'expense_date' => '2026-11-15',
            'amount' => 20000.00,
            'currency' => 'NGN',
        ]);

        // 2. Add second expense item via API
        $addResponse = $this->actingAs($this->staffUser)->postJson("/api/v1/claims/{$claim->id}/expenses", [
            'expense_type_id' => $this->mealExpenseType->id,
            'expense_date' => '2026-11-16',
            'amount' => 15000.00,
            'note' => 'Per diem',
        ]);

        $addResponse->assertStatus(201);
        $this->assertEquals(35000.00, (float) $claim->fresh()->total_amount);

        // 3. Remove initial expense item via API
        $delResponse = $this->actingAs($this->staffUser)->deleteJson("/api/v1/claims/{$claim->id}/expenses/{$exp1->id}");
        $delResponse->assertStatus(200);
        $this->assertEquals(15000.00, (float) $claim->fresh()->total_amount);
    }

    public function test_cannot_modify_expenses_on_approved_claim(): void
    {
        $claim = ClaimRequest::create([
            'claim_number' => 'CLM-2026-9099',
            'employee_id' => $this->staffEmployee->id,
            'claim_event_id' => $this->claimEvent->id,
            'currency' => 'NGN',
            'status' => ClaimRequest::STATUS_APPROVED,
            'total_amount' => 10000.00,
        ]);

        $exp = ClaimExpense::create([
            'claim_request_id' => $claim->id,
            'expense_type_id' => $this->mealExpenseType->id,
            'expense_date' => '2026-11-18',
            'amount' => 10000.00,
            'currency' => 'NGN',
        ]);

        // Attempt to add expense on approved claim -> fails with 400
        $addRes = $this->actingAs($this->staffUser)->postJson("/api/v1/claims/{$claim->id}/expenses", [
            'expense_type_id' => $this->travelExpenseType->id,
            'expense_date' => '2026-11-19',
            'amount' => 5000.00,
        ]);
        $addRes->assertStatus(400);

        // Attempt to delete expense on approved claim -> fails with 400
        $delRes = $this->actingAs($this->staffUser)->deleteJson("/api/v1/claims/{$claim->id}/expenses/{$exp->id}");
        $delRes->assertStatus(400);
    }

    // ==========================================
    // 3. Workflow State Machine & Business Rules
    // ==========================================

    public function test_claim_approval_workflow_submit_to_approve_to_pay(): void
    {
        // Create an initiated claim
        $claim = ClaimRequest::create([
            'claim_number' => 'CLM-2026-9002',
            'employee_id' => $this->staffEmployee->id,
            'claim_event_id' => $this->claimEvent->id,
            'currency' => 'NGN',
            'status' => ClaimRequest::STATUS_INITIATED,
            'total_amount' => 50000.00,
        ]);

        // 1. Submit claim
        $resSubmit = $this->actingAs($this->staffUser)->postJson("/api/v1/claims/{$claim->id}/action", [
            'action' => 'SUBMIT',
        ]);
        $resSubmit->assertStatus(200)
            ->assertJsonPath('data.status', 'SUBMITTED');

        // 2. HR Approves claim
        $resApprove = $this->actingAs($this->hrUser)->postJson("/api/v1/claims/{$claim->id}/action", [
            'action' => 'APPROVE',
        ]);
        $resApprove->assertStatus(200)
            ->assertJsonPath('data.status', 'APPROVED');
        $this->assertNotNull($claim->fresh()->approved_at);
        $this->assertEquals($this->hrUser->id, $claim->fresh()->approved_by);

        // 3. Admin / Finance pays claim
        $resPay = $this->actingAs($this->adminUser)->postJson("/api/v1/claims/{$claim->id}/action", [
            'action' => 'PAY',
        ]);
        $resPay->assertStatus(200)
            ->assertJsonPath('data.status', 'PAID');
        $this->assertNotNull($claim->fresh()->paid_at);
    }

    public function test_claim_rejection_requires_reason(): void
    {
        $claim = ClaimRequest::create([
            'claim_number' => 'CLM-2026-9003',
            'employee_id' => $this->staffEmployee->id,
            'claim_event_id' => $this->claimEvent->id,
            'currency' => 'NGN',
            'status' => ClaimRequest::STATUS_SUBMITTED,
            'total_amount' => 15000.00,
        ]);

        // Attempt rejection without reason -> should fail
        $resFail = $this->actingAs($this->hrUser)->postJson("/api/v1/claims/{$claim->id}/action", [
            'action' => 'REJECT',
            'reason' => '',
        ]);
        $resFail->assertStatus(400);

        // Reject with valid reason
        $resSuccess = $this->actingAs($this->hrUser)->postJson("/api/v1/claims/{$claim->id}/action", [
            'action' => 'REJECT',
            'reason' => 'Receipt was illegible and outside allowable window.',
        ]);
        $resSuccess->assertStatus(200)
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.rejection_reason', 'Receipt was illegible and outside allowable window.');
    }

    public function test_unauthorized_employee_cannot_approve_or_pay_claims(): void
    {
        $claim = ClaimRequest::create([
            'claim_number' => 'CLM-2026-9004',
            'employee_id' => $this->staffEmployee->id,
            'claim_event_id' => $this->claimEvent->id,
            'currency' => 'NGN',
            'status' => ClaimRequest::STATUS_SUBMITTED,
            'total_amount' => 30000.00,
        ]);

        // Regular employee attempts approval
        $res = $this->actingAs($this->otherStaffUser)->postJson("/api/v1/claims/{$claim->id}/action", [
            'action' => 'APPROVE',
        ]);
        $res->assertStatus(403);
    }

    public function test_employee_visibility_is_scoped_to_own_claims(): void
    {
        // Claim 1 for Jane Doe
        ClaimRequest::create([
            'claim_number' => 'CLM-2026-0001',
            'employee_id' => $this->staffEmployee->id,
            'claim_event_id' => $this->claimEvent->id,
            'currency' => 'NGN',
            'status' => ClaimRequest::STATUS_SUBMITTED,
            'total_amount' => 10000.00,
        ]);

        // Claim 2 for John Smith
        ClaimRequest::create([
            'claim_number' => 'CLM-2026-0002',
            'employee_id' => $this->otherStaffEmployee->id,
            'claim_event_id' => $this->claimEvent->id,
            'currency' => 'NGN',
            'status' => ClaimRequest::STATUS_SUBMITTED,
            'total_amount' => 25000.00,
        ]);

        // Jane queries claims: only sees 1 claim (hers)
        $resStaff = $this->actingAs($this->staffUser)->getJson('/api/v1/claims');
        $resStaff->assertStatus(200);
        $this->assertCount(1, $resStaff->json('data'));
        $this->assertEquals('CLM-2026-0001', $resStaff->json('data.0.claim_number'));

        // HR queries claims: sees all 2 claims
        $resHr = $this->actingAs($this->hrUser)->getJson('/api/v1/claims');
        $resHr->assertStatus(200);
        $this->assertCount(2, $resHr->json('data'));
    }
}
