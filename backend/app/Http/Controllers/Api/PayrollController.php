<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeLoan;
use App\Models\EmployeeProvidentFund;
use App\Models\EmployeeSalaryTemplate;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\SalaryTemplate;
use App\Services\PayrollService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use RuntimeException;

class PayrollController extends Controller
{
    private const HR_ROLES = ['PCCM_SUPER_ADMIN', 'HR_STAFF', 'ADMIN'];

    public function __construct(
        private readonly PayrollService $payrollService
    ) {}

    // --- SALARY TEMPLATES ---

    public function templates(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $templates = SalaryTemplate::query()
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $templates]);
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:salary_templates,name'],
            'code' => ['required', 'string', 'max:30', 'unique:salary_templates,code'],
            'pay_frequency' => ['required', Rule::in(['monthly', 'weekly'])],
            'basic_salary' => ['required', 'numeric', 'min:0'],
            'house_rent' => ['nullable', 'numeric', 'min:0'],
            'medical_allowance' => ['nullable', 'numeric', 'min:0'],
            'conveyance_allowance' => ['nullable', 'numeric', 'min:0'],
            'other_allowance' => ['nullable', 'numeric', 'min:0'],
            'provident_fund_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $template = $this->payrollService->saveSalaryTemplate($validated);
        AuditLogger::record($request, 'Payroll', 'Created salary template', $template->id, $template->name, null, 'Created');

        return response()->json(['data' => $template], 201);
    }

    // --- EMPLOYEE SALARY ASSIGNMENTS ---

    public function assignments(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $query = EmployeeSalaryTemplate::query()
            ->with(['employee:id,staff_id,full_name,entity_id,department_id', 'salaryTemplate:id,name,code'])
            ->orderByDesc('effective_from');

        if ($request->filled('employeeId')) {
            $query->where('employee_id', $request->input('employeeId'));
        }

        return response()->json(['data' => $query->paginate(50)]);
    }

    public function assignTemplate(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'salary_template_id' => ['required', 'integer', 'exists:salary_templates,id'],
            'pay_frequency' => ['nullable', Rule::in(['monthly', 'weekly'])],
            'basic_salary' => ['required', 'numeric', 'min:0'],
            'house_rent' => ['nullable', 'numeric', 'min:0'],
            'medical_allowance' => ['nullable', 'numeric', 'min:0'],
            'conveyance_allowance' => ['nullable', 'numeric', 'min:0'],
            'other_allowance' => ['nullable', 'numeric', 'min:0'],
            'provident_fund_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'ctc_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'effective_from' => ['required', 'date_format:Y-m-d'],
            'effective_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:effective_from'],
        ]);

        try {
            $assignment = $this->payrollService->assignSalaryTemplate($validated);
            AuditLogger::record($request, 'Payroll', 'Assigned salary template', $assignment->id, "Employee {$assignment->employee_id}", null, 'Assigned');

            return response()->json(['data' => $assignment->load(['employee', 'salaryTemplate'])], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // --- PAYROLL RUNS ---

    public function runs(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $runs = PayrollRun::query()
            ->with(['processor:id,name,email'])
            ->withCount('items')
            ->orderByDesc('period_start')
            ->paginate(20);

        return response()->json(['data' => $runs]);
    }

    public function generateRun(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'pay_frequency' => ['required', Rule::in(['monthly', 'weekly'])],
            'period_start' => ['required', 'date_format:Y-m-d'],
            'period_end' => ['required', 'date_format:Y-m-d', 'after_or_equal:period_start'],
            'period_label' => ['nullable', 'string', 'max:100'],
            'pay_date' => ['nullable', 'date_format:Y-m-d'],
            'payroll_week' => ['nullable', 'integer', 'min:1', 'max:53'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'entity_id' => ['nullable', 'string'],
            'department_id' => ['nullable', 'integer'],
        ]);

        try {
            $run = $this->payrollService->generatePayrollRun($validated, (int) $request->user()->id);
            AuditLogger::record($request, 'Payroll', 'Generated payroll run draft', $run->id, "Period {$run->period_label}", null, 'Draft');

            return response()->json(['data' => $run], 201);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function showRun(Request $request, PayrollRun $run): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $run->load([
            'items.employee:id,staff_id,full_name,entity_id,department_id,job_title',
            'items.employee.entity:id,name,short_code',
            'items.employee.department:id,name',
            'items.deductions',
            'processor:id,name,email',
        ]);

        return response()->json(['data' => $run]);
    }

    public function finalizeRun(Request $request, PayrollRun $run): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        try {
            $finalized = $this->payrollService->finalizePayrollRun($run, (int) $request->user()->id);
            AuditLogger::record($request, 'Payroll', 'Finalized payroll run', $finalized->id, "Period {$finalized->period_label}", 'draft', 'processed');

            return response()->json(['data' => $finalized, 'message' => 'Payroll run finalized successfully.']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // --- PAYSLIPS ---

    public function showPayslip(Request $request, PayrollItem $item): JsonResponse
    {
        $user = $request->user();
        $isHR = in_array($user->role, self::HR_ROLES, true);

        // Security authorization: Self-service employee can only view their own payslip
        if (! $isHR) {
            $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
            abort_unless($employee && (int) $employee->id === (int) $item->employee_id, 403, 'Unauthorized access to payslip.');
        }

        $item->load([
            'payrollRun',
            'employee:id,staff_id,full_name,job_title,entity_id,department_id',
            'employee.entity:id,name',
            'employee.department:id,name',
            'deductions',
        ]);

        return response()->json(['data' => $item]);
    }

    public function markPayslipPaid(Request $request, PayrollItem $item): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'payment_reference' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $paidItem = $this->payrollService->markItemPaid($item, $validated['payment_reference'] ?? null);
            AuditLogger::record($request, 'Payroll', 'Marked payslip as paid', $paidItem->id, "Employee {$paidItem->employee_id}", 'pending', 'paid');

            return response()->json(['data' => $paidItem, 'message' => 'Payment reference recorded and payslip marked as paid.']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // --- LOANS & INSTALLMENTS ---

    public function loans(Request $request): JsonResponse
    {
        $user = $request->user();
        $isHR = in_array($user->role, self::HR_ROLES, true);

        $query = EmployeeLoan::query()->with(['employee:id,staff_id,full_name', 'installments']);
        if (! $isHR) {
            $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
            $query->where('employee_id', $employee?->id ?? 0);
        }

        return response()->json(['data' => $query->latest('issued_date')->paginate(20)]);
    }

    public function storeLoan(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'loan_reference' => ['required', 'string', 'max:60', 'unique:employee_loans,loan_reference'],
            'principal_amount' => ['required', 'numeric', 'min:1'],
            'interest_rate_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'installment_count' => ['required', 'integer', 'min:1', 'max:120'],
            'issued_date' => ['required', 'date_format:Y-m-d'],
            'first_installment_date' => ['nullable', 'date_format:Y-m-d'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $loan = $this->payrollService->saveLoan($validated);
        AuditLogger::record($request, 'Payroll', 'Created employee loan', $loan->id, $loan->loan_reference, null, 'Active');

        return response()->json(['data' => $loan->load('installments')], 201);
    }

    public function approveLoan(Request $request, EmployeeLoan $loan): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'step' => ['required', Rule::in(['supervisor', 'final'])],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $approved = $this->payrollService->approveLoan($loan, $validated['step'], (int) $request->user()->id, $validated['remarks'] ?? null);
            AuditLogger::record($request, 'Payroll', "Approved loan ({$validated['step']})", $approved->id, $approved->loan_reference, null, $approved->status);

            return response()->json(['data' => $approved]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // --- DEDUCTIONS ---

    public function deductions(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $query = EmployeeDeduction::query()->with('employee:id,staff_id,full_name');
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->input('employee_id'));
        }

        return response()->json(['data' => $query->paginate(50)]);
    }

    public function storeDeduction(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'deduction_type' => ['required', 'string', 'max:50'],
            'calculation_type' => ['required', Rule::in(['fixed', 'percent'])],
            'amount' => ['required', 'numeric', 'min:0'],
            'effective_from' => ['required', 'date_format:Y-m-d'],
            'effective_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:effective_from'],
            'frequency' => ['required', Rule::in(['monthly', 'weekly', 'one_time'])],
            'reason' => ['nullable', 'string', 'max:255'],
            'comments' => ['nullable', 'string', 'max:1000'],
        ]);

        $deduction = $this->payrollService->saveDeduction($validated);
        AuditLogger::record($request, 'Payroll', 'Created employee deduction', $deduction->id, $deduction->deduction_type, null, 'Active');

        return response()->json(['data' => $deduction], 201);
    }

    // --- PROVIDENT FUNDS ---

    public function providentFunds(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $funds = EmployeeProvidentFund::query()->with('employee:id,staff_id,full_name')->paginate(50);

        return response()->json(['data' => $funds]);
    }

    public function storeProvidentFund(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'employee_contribution_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'employer_contribution_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'effective_from' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $fund = $this->payrollService->saveProvidentFund($validated);
        AuditLogger::record($request, 'Payroll', 'Configured employee provident fund', $fund->id, "Employee {$fund->employee_id}", null, 'Configured');

        return response()->json(['data' => $fund], 201);
    }

    private function authorizeRole(Request $request, array $roles): void
    {
        abort_unless(in_array($request->user()->role, $roles, true), 403, 'Unauthorized access.');
    }
}
