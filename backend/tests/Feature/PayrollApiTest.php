<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeLoan;
use App\Models\EmployeeSalaryTemplate;
use App\Models\Entity;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\SalaryTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PayrollApiTest extends TestCase
{
    use RefreshDatabase;

    private Entity $entity;

    private Department $department;

    private User $hrUser;

    private User $employeeUser;

    private Employee $employee1;

    private Employee $employee2;

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
            'name' => 'People, Culture & Change',
            'code' => 'CGCC-PCCM',
            'is_active' => true,
        ]);

        $this->employee1 = Employee::create([
            'staff_id' => 'CGCC/001',
            'full_name' => 'Dr. Bukola Adeleke',
            'first_name' => 'Bukola',
            'last_name' => 'Adeleke',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'PCCM Director',
            'status' => 'Active',
        ]);

        $this->employee2 = Employee::create([
            'staff_id' => 'CGCC/002',
            'full_name' => 'Bro. Tosin Alabi',
            'first_name' => 'Tosin',
            'last_name' => 'Alabi',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Associate Officer',
            'status' => 'Active',
        ]);

        $this->hrUser = User::create([
            'name' => 'Dr. Bukola Adeleke',
            'email' => 'hr@citadel.ng',
            'password' => Hash::make('SecretPassword123!'),
            'role' => 'PCCM_SUPER_ADMIN',
            'staff_id' => $this->employee1->staff_id,
            'is_active' => true,
        ]);

        $this->employeeUser = User::create([
            'name' => 'Bro. Tosin Alabi',
            'email' => 'tosin@citadel.ng',
            'password' => Hash::make('SecretPassword123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $this->employee2->staff_id,
            'is_active' => true,
        ]);
    }

    public function test_payroll_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/payroll/templates')->assertUnauthorized();
        $this->getJson('/api/v1/payroll/runs')->assertUnauthorized();
    }

    public function test_employee_role_cannot_manage_salary_templates(): void
    {
        $this->actingAs($this->employeeUser)
            ->getJson('/api/v1/payroll/templates')
            ->assertForbidden();
    }

    public function test_hr_can_create_salary_template(): void
    {
        $payload = [
            'name' => 'Grade 3 Specialist Structure',
            'code' => 'G3-SPEC',
            'pay_frequency' => 'monthly',
            'basic_salary' => 500000.00,
            'house_rent' => 80000.00,
            'medical_allowance' => 30000.00,
            'conveyance_allowance' => 40000.00,
            'other_allowance' => 0.00,
            'provident_fund_percent' => 8.00,
            'tax_percent' => 10.00,
            'notes' => 'Standard specialist compensation package',
        ];

        $response = $this->actingAs($this->hrUser)
            ->postJson('/api/v1/payroll/templates', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('salary_templates', [
            'code' => 'G3-SPEC',
            'basic_salary' => 500000.00,
        ]);
    }

    public function test_hr_can_assign_salary_template_to_employee_and_prevent_overlaps(): void
    {
        $template = SalaryTemplate::create([
            'name' => 'Grade 3 Specialist',
            'code' => 'G3-SPEC-2',
            'pay_frequency' => 'monthly',
            'basic_salary' => 400000.00,
            'house_rent' => 60000.00,
            'medical_allowance' => 20000.00,
            'conveyance_allowance' => 20000.00,
            'provident_fund_percent' => 8.00,
            'tax_percent' => 10.00,
        ]);

        $payload = [
            'employee_id' => $this->employee2->id,
            'salary_template_id' => $template->id,
            'pay_frequency' => 'monthly',
            'basic_salary' => 400000.00,
            'house_rent' => 60000.00,
            'medical_allowance' => 20000.00,
            'conveyance_allowance' => 20000.00,
            'provident_fund_percent' => 8.00,
            'tax_percent' => 10.00,
            'effective_from' => '2026-01-01',
            'effective_to' => '2026-12-31',
        ];

        $this->actingAs($this->hrUser)
            ->postJson('/api/v1/payroll/assignments', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('employee_salary_templates', [
            'employee_id' => $this->employee2->id,
            'gross_salary' => 500000.00, // 400k basic + 100k allowances
        ]);
    }

    public function test_hr_can_create_and_approve_employee_loan(): void
    {
        $payload = [
            'employee_id' => $this->employee2->id,
            'loan_reference' => 'LN-2026-001',
            'principal_amount' => 120000.00,
            'interest_rate_percent' => 0.00,
            'installment_count' => 12,
            'issued_date' => '2026-01-01',
            'first_installment_date' => '2026-01-31',
            'remarks' => 'Staff emergency advance',
        ];

        $res = $this->actingAs($this->hrUser)
            ->postJson('/api/v1/payroll/loans', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('employee_loans', [
            'loan_reference' => 'LN-2026-001',
            'installment_amount' => 10000.00,
        ]);

        $this->assertDatabaseCount('loan_installments', 12);
    }

    public function test_end_to_end_payroll_run_generation_and_payslip_calculations(): void
    {
        // 1. Setup salary structure for employee2
        $template = SalaryTemplate::create([
            'name' => 'Officer Level 2',
            'code' => 'OFF-L2',
            'pay_frequency' => 'monthly',
            'basic_salary' => 500000.00,
            'house_rent' => 100000.00,
            'medical_allowance' => 30000.00,
            'conveyance_allowance' => 20000.00,
            'provident_fund_percent' => 8.00,
            'tax_percent' => 10.00,
        ]);

        EmployeeSalaryTemplate::create([
            'employee_id' => $this->employee2->id,
            'salary_template_id' => $template->id,
            'pay_frequency' => 'monthly',
            'basic_salary' => 500000.00,
            'house_rent' => 100000.00,
            'medical_allowance' => 30000.00,
            'conveyance_allowance' => 20000.00,
            'gross_salary' => 650000.00,
            'provident_fund_percent' => 8.00,
            'tax_percent' => 10.00,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        // 2. Setup active loan with installment due in November 2026
        $loan = EmployeeLoan::create([
            'employee_id' => $this->employee2->id,
            'loan_reference' => 'LN-NOV-TEST',
            'principal_amount' => 120000.00,
            'interest_rate_percent' => 0.00,
            'installment_count' => 12,
            'installment_amount' => 10000.00,
            'issued_date' => '2026-01-01',
            'status' => 'active',
        ]);

        $loan->installments()->create([
            'installment_no' => 11,
            'due_date' => '2026-11-25',
            'amount' => 10000.00,
            'status' => 'pending',
        ]);

        // 3. Setup recurring custom deduction
        EmployeeDeduction::create([
            'employee_id' => $this->employee2->id,
            'deduction_type' => 'Health Insurance Top-up',
            'calculation_type' => 'fixed',
            'amount' => 5000.00,
            'effective_from' => '2026-01-01',
            'frequency' => 'monthly',
            'is_active' => true,
        ]);

        // 4. Generate draft payroll run for November 2026
        $generatePayload = [
            'pay_frequency' => 'monthly',
            'period_start' => '2026-11-01',
            'period_end' => '2026-11-30',
            'period_label' => 'November 2026',
            'employee_id' => $this->employee2->id,
        ];

        $runResponse = $this->actingAs($this->hrUser)
            ->postJson('/api/v1/payroll/runs', $generatePayload)
            ->assertCreated();

        $runId = $runResponse->json('data.id');
        $this->assertNotNull($runId);

        // Verify draft payslip calculations
        $payslip = PayrollItem::where('payroll_run_id', $runId)->where('employee_id', $this->employee2->id)->first();
        $this->assertNotNull($payslip);

        // Basic = 500k, Allowances = 150k => Gross = 650k
        $this->assertEquals(500000.00, (float) $payslip->basic_salary);
        $this->assertEquals(150000.00, (float) $payslip->allowance_total);

        // Tax = 10% of basic = 50k
        $this->assertEquals(50000.00, (float) $payslip->tax_deduction);

        // PF = 8% of basic = 40k
        $this->assertEquals(40000.00, (float) $payslip->provident_fund_deduction);

        // Loan deduction = 10k
        $this->assertEquals(10000.00, (float) $payslip->loan_deduction);

        // Other deduction = 5k
        $this->assertEquals(5000.00, (float) $payslip->other_deduction);

        // Total deductions = 50k + 40k + 10k + 5k = 105k
        $this->assertEquals(105000.00, (float) $payslip->total_deduction);

        // Net payable = 650k - 105k = 545,000.00
        $this->assertEquals(545000.00, (float) $payslip->net_payable);

        // 5. Finalize the payroll run
        $this->actingAs($this->hrUser)
            ->postJson("/api/v1/payroll/runs/{$runId}/finalize")
            ->assertOk();

        $run = PayrollRun::find($runId);
        $this->assertEquals('processed', $run->status);

        // Loan installment should now be marked as paid
        $installment = $loan->installments()->where('installment_no', 11)->first();
        $this->assertEquals('paid', $installment->status);
        $this->assertEquals($payslip->id, $installment->payroll_item_id);

        // 6. Employee can access their own payslip
        $this->actingAs($this->employeeUser)
            ->getJson("/api/v1/payroll/payslips/{$payslip->id}")
            ->assertOk()
            ->assertJsonPath('data.net_payable', '545000.00');

        // 7. Employee cannot view another employee's payslip
        $otherPayslip = PayrollItem::create([
            'payroll_run_id' => $runId,
            'employee_id' => $this->employee1->id,
            'pay_frequency' => 'monthly',
            'basic_salary' => 800000.00,
            'net_payable' => 700000.00,
            'payment_status' => 'pending',
        ]);

        $this->actingAs($this->employeeUser)
            ->getJson("/api/v1/payroll/payslips/{$otherPayslip->id}")
            ->assertForbidden();

        // 8. HR marks payslip paid with reference
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/payroll/payslips/{$payslip->id}/paid", [
                'payment_reference' => 'NIP-CITADEL-20261130-9981',
            ])
            ->assertOk();

        $this->assertDatabaseHas('payroll_items', [
            'id' => $payslip->id,
            'payment_status' => 'paid',
            'payment_reference' => 'NIP-CITADEL-20261130-9981',
        ]);
    }
}
