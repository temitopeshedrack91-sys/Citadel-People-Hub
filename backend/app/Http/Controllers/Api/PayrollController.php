<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeLoan;
use App\Models\EmployeeProvidentFund;
use App\Models\EmployeeSalaryTemplate;
use App\Models\LeaveRequest;
use App\Models\PayrollAdjustment;
use App\Models\PayrollExcelMapping;
use App\Models\PayrollExcelTemplate;
use App\Models\PayrollImportBatch;
use App\Models\PayrollImportRow;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\SalaryTemplate;
use App\Services\PayrollService;
use App\Support\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
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

    // --- EXCEL PAYROLL TEMPLATES ---

    public function excelTemplates(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $templates = PayrollExcelTemplate::query()
            ->with(['creator:id,name,email', 'entity:id,name,short_code', 'mappings'])
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->when($request->filled('entity_id'), fn ($q) => $q->where('entity_id', $request->input('entity_id')))
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json(['data' => $templates]);
    }

    public function storeExcelTemplate(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'entity_id' => ['nullable', 'string', 'exists:entities,id'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        if ($validated['is_default'] ?? false) {
            PayrollExcelTemplate::where('entity_id', $validated['entity_id'] ?? null)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template = PayrollExcelTemplate::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'entity_id' => $validated['entity_id'] ?? null,
            'created_by' => (int) $request->user()->id,
            'is_default' => $validated['is_default'] ?? false,
            'columns' => [],
            'mappings' => [],
        ]);

        AuditLogger::record($request, 'Payroll', 'Created Excel payroll template', $template->id, $template->name, null, 'Created');

        return response()->json(['data' => $template->load('mappings')], 201);
    }

    public function showExcelTemplate(Request $request, PayrollExcelTemplate $template): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $template->load(['creator:id,name,email', 'entity:id,name,short_code', 'mappings', 'importBatches' => fn ($q) => $q->latest()->limit(10)]);

        return response()->json(['data' => $template]);
    }

    public function updateExcelTemplate(Request $request, PayrollExcelTemplate $template): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'entity_id' => ['nullable', 'string', 'exists:entities,id'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'columns' => ['sometimes', 'array'],
            'mappings' => ['sometimes', 'array'],
        ]);

        if (($validated['is_default'] ?? false) && ($validated['entity_id'] ?? $template->entity_id) !== $template->entity_id) {
            PayrollExcelTemplate::where('entity_id', $validated['entity_id'] ?? $template->entity_id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template->update($validated);

        AuditLogger::record($request, 'Payroll', 'Updated Excel payroll template', $template->id, $template->name, null, 'Updated');

        return response()->json(['data' => $template->load('mappings')]);
    }

    public function deleteExcelTemplate(Request $request, PayrollExcelTemplate $template): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $template->delete();

        AuditLogger::record($request, 'Payroll', 'Deleted Excel payroll template', $template->id, $template->name, null, 'Deleted');

        return response()->json(['message' => 'Template deleted successfully.']);
    }

    // --- EXCEL PAYROLL UPLOAD & PREVIEW ---

    public function previewExcelUpload(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
            'template_id' => ['nullable', 'integer', 'exists:payroll_excel_templates,id'],
        ]);

        $file = $request->file('file');
        $templateId = $request->input('template_id');

        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            if (empty($rows)) {
                return response()->json(['message' => 'Excel file is empty.'], 422);
            }

            $headers = array_shift($rows);
            $previewRows = array_slice($rows, 0, 10);

            $template = null;
            if ($templateId) {
                $template = PayrollExcelTemplate::with('mappings')->find($templateId);
            }

            $suggestedMappings = $this->suggestColumnMappings($headers, $template);

            return response()->json([
                'data' => [
                    'headers' => array_values($headers),
                    'total_rows' => count($rows),
                    'preview_rows' => array_values($previewRows),
                    'suggested_mappings' => $suggestedMappings,
                    'template' => $template,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to parse Excel file: '.$e->getMessage()], 422);
        }
    }

    public function importExcelPayroll(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
            'template_id' => ['nullable', 'integer', 'exists:payroll_excel_templates,id'],
            'mappings' => ['required', 'array'],
            'mappings.*.excel_column' => ['required', 'string'],
            'mappings.*.payroll_field' => ['required', 'string'],
            'mappings.*.field_type' => ['required', Rule::in(['earning', 'deduction', 'identifier', 'info'])],
            'mappings.*.calculation_type' => ['nullable', Rule::in(['fixed', 'percentage', 'formula'])],
            'mappings.*.default_value' => ['nullable', 'numeric'],
            'mappings.*.is_required' => ['nullable', 'boolean'],
            'mappings.*.is_identifier' => ['nullable', 'boolean'],
            'mappings.*.sort_order' => ['nullable', 'integer'],
            'save_as_template' => ['nullable', 'boolean'],
            'template_name' => ['nullable', 'string', 'max:255'],
            'import_options' => ['nullable', 'array'],
        ]);

        $file = $request->file('file');
        $userId = (int) $request->user()->id;

        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            if (empty($rows)) {
                return response()->json(['message' => 'Excel file is empty.'], 422);
            }

            $headers = array_shift($rows);
            $dataRows = $rows;

            $template = null;
            if ($validated['save_as_template'] && ! empty($validated['template_name'])) {
                if ($validated['template_id']) {
                    $template = PayrollExcelTemplate::find($validated['template_id']);
                } else {
                    $template = PayrollExcelTemplate::create([
                        'name' => $validated['template_name'],
                        'description' => 'Auto-created from Excel upload on '.now()->format('Y-m-d H:i'),
                        'original_filename' => $file->getClientOriginalName(),
                        'created_by' => $userId,
                        'columns' => array_values($headers),
                        'mappings' => $validated['mappings'],
                        'sample_data' => array_slice($dataRows, 0, 5),
                        'is_active' => true,
                        'is_default' => false,
                    ]);
                }

                PayrollExcelMapping::where('template_id', $template->id)->delete();
                foreach ($validated['mappings'] as $mapping) {
                    PayrollExcelMapping::create([
                        'template_id' => $template->id,
                        'excel_column' => $mapping['excel_column'],
                        'payroll_field' => $mapping['payroll_field'],
                        'field_type' => $mapping['field_type'],
                        'calculation_type' => $mapping['calculation_type'] ?? null,
                        'default_value' => $mapping['default_value'] ?? null,
                        'is_required' => $mapping['is_required'] ?? false,
                        'is_identifier' => $mapping['is_identifier'] ?? false,
                        'sort_order' => $mapping['sort_order'] ?? 0,
                    ]);
                }
            }

            $batch = PayrollImportBatch::create([
                'template_id' => $validated['template_id'] ?? $template?->id,
                'original_filename' => $file->getClientOriginalName(),
                'uploaded_by' => $userId,
                'status' => 'validating',
                'total_rows' => count($dataRows),
                'import_options' => $validated['import_options'] ?? [],
            ]);

            $mappings = collect($validated['mappings'])->keyBy('excel_column');

            $identifierMappings = $mappings->where('is_identifier', true)->values();
            $earningMappings = $mappings->where('field_type', 'earning')->values();
            $deductionMappings = $mappings->where('field_type', 'deduction')->values();

            $validRows = 0;
            $errorRows = 0;
            $warningRows = 0;
            $validationErrors = [];
            $validationWarnings = [];

            foreach ($dataRows as $index => $row) {
                $rowNumber = $index + 2;
                $mappedData = [];
                $rowErrors = [];
                $rowWarnings = [];

                foreach ($mappings as $mapping) {
                    $excelCol = $mapping['excel_column'];
                    $value = $row[$excelCol] ?? $mapping['default_value'] ?? null;

                    if ($mapping['is_required'] && ($value === null || $value === '')) {
                        $rowErrors[] = "Required column '{$excelCol}' is empty";

                        continue;
                    }

                    $mappedData[$mapping['payroll_field']] = $value;
                }

                $employee = null;
                $matchMethod = 'none';
                $matchConfidence = 'none';

                if ($identifierMappings->isNotEmpty()) {
                    foreach ($identifierMappings as $idMapping) {
                        $identifierValue = $mappedData[$idMapping['payroll_field']] ?? null;
                        if ($identifierValue) {
                            $found = $this->findEmployeeByIdentifier($identifierValue, $idMapping['payroll_field']);
                            if ($found) {
                                $employee = $found;
                                $matchMethod = $idMapping['payroll_field'];
                                $matchConfidence = 'high';
                                break;
                            }
                        }
                    }
                }

                if (! $employee) {
                    $rowWarnings[] = 'Employee not found - manual assignment required';
                    $matchConfidence = 'none';
                }

                $status = $rowErrors ? 'error' : ($rowWarnings ? 'warning' : 'pending');

                if ($status === 'error') {
                    $errorRows++;
                } elseif ($status === 'warning') {
                    $warningRows++;
                } else {
                    $validRows++;
                }

                if ($rowErrors) {
                    $validationErrors[] = ['row' => $rowNumber, 'errors' => $rowErrors];
                }
                if ($rowWarnings) {
                    $validationWarnings[] = ['row' => $rowNumber, 'warnings' => $rowWarnings];
                }

                PayrollImportRow::create([
                    'batch_id' => $batch->id,
                    'row_number' => $rowNumber,
                    'raw_data' => $row,
                    'mapped_data' => $mappedData,
                    'employee_id' => $employee?->id,
                    'match_method' => $matchMethod,
                    'match_confidence' => $matchConfidence,
                    'status' => $status,
                    'errors' => $rowErrors ?: null,
                    'warnings' => $rowWarnings ?: null,
                ]);
            }

            $batch->update([
                'status' => $errorRows > 0 ? 'preview' : 'validated',
                'valid_rows' => $validRows,
                'error_rows' => $errorRows,
                'warning_rows' => $warningRows,
                'validation_errors' => $validationErrors ?: null,
                'validation_warnings' => $validationWarnings ?: null,
            ]);

            AuditLogger::record($request, 'Payroll', 'Uploaded Excel payroll file', $batch->id, $batch->original_filename, null, 'Uploaded');

            return response()->json([
                'data' => $batch->load(['rows' => fn ($q) => $q->orderBy('row_number')->limit(50)]),
                'message' => "Import preview ready. {$validRows} valid, {$warningRows} warnings, {$errorRows} errors.",
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Import failed: '.$e->getMessage()], 500);
        }
    }

    public function getImportBatch(Request $request, PayrollImportBatch $batch): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $batch->load(['rows' => fn ($q) => $q->orderBy('row_number'), 'template']);

        return response()->json(['data' => $batch]);
    }

    public function updateImportRow(Request $request, PayrollImportRow $row): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'mapped_data' => ['nullable', 'array'],
            'status' => ['sometimes', Rule::in(['pending', 'matched', 'unmatched', 'error', 'warning'])],
        ]);

        $row->update($validated);

        return response()->json(['data' => $row->load('employee')]);
    }

    public function processImportBatch(Request $request, PayrollImportBatch $batch): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'payroll_run_id' => ['nullable', 'integer', 'exists:payroll_runs,id'],
            'create_payroll_run' => ['sometimes', 'boolean'],
            'period_start' => ['required_if:create_payroll_run,true', 'date_format:Y-m-d'],
            'period_end' => ['required_if:create_payroll_run,true', 'date_format:Y-m-d', 'after_or_equal:period_start'],
            'pay_date' => ['nullable', 'date_format:Y-m-d'],
            'pay_frequency' => ['nullable', Rule::in(['monthly', 'weekly'])],
            'proration_method' => ['nullable', Rule::in(['calendar_days', 'working_days'])],
            'apply_attendance_penalties' => ['nullable', 'boolean'],
        ]);

        if ($batch->status !== 'validated' && $batch->status !== 'preview') {
            return response()->json(['message' => 'Batch must be validated before processing.'], 422);
        }

        $rows = $batch->rows()->where('status', '!=', 'error')->get();

        if ($rows->isEmpty()) {
            return response()->json(['message' => 'No valid rows to process.'], 422);
        }

        try {
            return DB::transaction(function () use ($batch, $rows, $validated, $request) {
                $payrollRun = null;

                if ($validated['create_payroll_run'] ?? false) {
                    $payrollRun = $this->payrollService->generatePayrollRun([
                        'pay_frequency' => $validated['pay_frequency'] ?? 'monthly',
                        'period_start' => $validated['period_start'],
                        'period_end' => $validated['period_end'],
                        'pay_date' => $validated['pay_date'] ?? null,
                        'period_label' => CarbonImmutable::parse($validated['period_start'])->format('M Y'),
                    ], (int) $request->user()->id);

                    $batch->update(['payroll_run_id' => $payrollRun->id]);
                } elseif ($validated['payroll_run_id']) {
                    $payrollRun = PayrollRun::findOrFail($validated['payroll_run_id']);
                }

                $processed = 0;
                $prorationMethod = $validated['proration_method'] ?? 'calendar_days';
                $applyAttendancePenalties = $validated['apply_attendance_penalties'] ?? false;

                foreach ($rows as $row) {
                    if (! $row->employee_id) {
                        continue;
                    }

                    $mappedData = $row->mapped_data ?? [];

                    if ($payrollRun) {
                        $periodStart = CarbonImmutable::parse($payrollRun->period_start);
                        $periodEnd = CarbonImmutable::parse($payrollRun->period_end);

                        $assignment = $this->payrollService->activeSalaryAssignment($row->employee_id, $periodEnd);
                        if ($assignment) {
                            $item = $payrollRun->items()->where('employee_id', $row->employee_id)->first();

                            if ($item) {
                                $this->applyExcelDataToPayrollItem($item, $mappedData, $assignment, $periodStart, $periodEnd, $prorationMethod, $applyAttendancePenalties, $batch->id);
                                $processed++;
                            }
                        }
                    }

                    $row->update(['status' => 'matched']);
                }

                if ($payrollRun) {
                    $this->payrollService->refreshRunTotals($payrollRun);
                }

                $batch->update([
                    'status' => 'completed',
                    'processed_at' => now(),
                    'valid_rows' => $processed,
                ]);

                AuditLogger::record($request, 'Payroll', 'Processed Excel payroll import', $batch->id, $batch->original_filename, 'preview', 'completed');

                return response()->json([
                    'data' => [
                        'batch' => $batch->fresh(),
                        'payroll_run' => $payrollRun,
                        'processed_count' => $processed,
                    ],
                    'message' => "Successfully processed {$processed} employee payroll records.",
                ]);
            });
        } catch (\Exception $e) {
            $batch->update(['status' => 'failed']);

            return response()->json(['message' => 'Processing failed: '.$e->getMessage()], 500);
        }
    }

    // --- PAYROLL ADJUSTMENTS ---

    public function adjustments(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $query = PayrollAdjustment::query()
            ->with(['payrollItem', 'payrollRun', 'employee:id,staff_id,full_name', 'adjuster:id,name,email'])
            ->when($request->filled('payroll_run_id'), fn ($q) => $q->where('payroll_run_id', $request->input('payroll_run_id')))
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->input('employee_id')))
            ->orderByDesc('adjusted_at')
            ->paginate(50);

        return response()->json(['data' => $query]);
    }

    public function storeAdjustment(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'payroll_item_id' => ['required', 'integer', 'exists:payroll_items,id'],
            'payroll_run_id' => ['required', 'integer', 'exists:payroll_runs,id'],
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'field_name' => ['required', 'string'],
            'field_category' => ['required', Rule::in(['earning', 'deduction', 'other'])],
            'original_value' => ['required', 'numeric'],
            'adjusted_value' => ['required', 'numeric'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $item = PayrollItem::with('payrollRun')->findOrFail($validated['payroll_item_id']);

        if ($item->payrollRun?->status !== 'draft') {
            return response()->json(['message' => 'Adjustments can only be made on draft payroll runs.'], 422);
        }

        $difference = $validated['adjusted_value'] - $validated['original_value'];

        $adjustment = PayrollAdjustment::create([
            'payroll_item_id' => $validated['payroll_item_id'],
            'payroll_run_id' => $validated['payroll_run_id'],
            'employee_id' => $validated['employee_id'],
            'field_name' => $validated['field_name'],
            'field_category' => $validated['field_category'],
            'original_value' => $validated['original_value'],
            'adjusted_value' => $validated['adjusted_value'],
            'difference' => $difference,
            'reason' => $validated['reason'],
            'adjusted_by' => (int) $request->user()->id,
            'is_system_generated' => false,
        ]);

        $this->applyAdjustmentToPayrollItem($item, $validated['field_name'], $validated['field_category'], $validated['adjusted_value']);

        AuditLogger::record($request, 'Payroll', 'Manual payroll adjustment', $adjustment->id, "{$validated['field_name']} for employee {$validated['employee_id']}", $validated['original_value'], $validated['adjusted_value']);

        return response()->json(['data' => $adjustment->load('employee', 'adjuster')], 201);
    }

    // --- ATTENDANCE PENALTY RULES ---

    public function penaltyRules(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $rules = AttendancePenaltyRule::query()
            ->with('entity:id,name,short_code')
            ->when($request->filled('entity_id'), fn ($q) => $q->where('entity_id', $request->input('entity_id')))
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('penalty_type')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $rules]);
    }

    public function storePenaltyRule(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'entity_id' => ['nullable', 'string', 'exists:entities,id'],
            'penalty_type' => ['required', Rule::in(['lateness', 'unapproved_absence', 'unpaid_leave'])],
            'calculation_method' => ['required', Rule::in(['fixed_per_incident', 'percentage_of_daily_rate', 'tiered'])],
            'amount_per_incident' => ['nullable', 'numeric', 'min:0'],
            'percentage_of_daily_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tiered_rules' => ['nullable', 'array'],
            'grace_period_minutes' => ['nullable', 'integer', 'min:0'],
            'max_incidents_per_period' => ['nullable', 'integer', 'min:1'],
            'apply_to_gross' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $rule = AttendancePenaltyRule::create($validated);

        AuditLogger::record($request, 'Payroll', 'Created attendance penalty rule', $rule->id, $rule->name, null, 'Created');

        return response()->json(['data' => $rule->load('entity')], 201);
    }

    public function updatePenaltyRule(Request $request, AttendancePenaltyRule $rule): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'entity_id' => ['nullable', 'string', 'exists:entities,id'],
            'penalty_type' => ['sometimes', Rule::in(['lateness', 'unapproved_absence', 'unpaid_leave'])],
            'calculation_method' => ['sometimes', Rule::in(['fixed_per_incident', 'percentage_of_daily_rate', 'tiered'])],
            'amount_per_incident' => ['nullable', 'numeric', 'min:0'],
            'percentage_of_daily_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tiered_rules' => ['nullable', 'array'],
            'grace_period_minutes' => ['nullable', 'integer', 'min:0'],
            'max_incidents_per_period' => ['nullable', 'integer', 'min:1'],
            'apply_to_gross' => ['nullable', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $rule->update($validated);

        AuditLogger::record($request, 'Payroll', 'Updated attendance penalty rule', $rule->id, $rule->name, null, 'Updated');

        return response()->json(['data' => $rule->load('entity')]);
    }

    public function deletePenaltyRule(Request $request, AttendancePenaltyRule $rule): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $rule->delete();

        AuditLogger::record($request, 'Payroll', 'Deleted attendance penalty rule', $rule->id, $rule->name, null, 'Deleted');

        return response()->json(['message' => 'Penalty rule deleted successfully.']);
    }

    // --- PRORATION RECORDS ---

    public function prorationRecords(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);

        $records = EmployeeProrationRecord::query()
            ->with(['payrollItem', 'payrollRun', 'employee:id,staff_id,full_name'])
            ->when($request->filled('payroll_run_id'), fn ($q) => $q->where('payroll_run_id', $request->input('payroll_run_id')))
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->input('employee_id')))
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json(['data' => $records]);
    }

    private function suggestColumnMappings(array $headers, ?PayrollExcelTemplate $template = null): array
    {
        $fieldMap = [
            'staff_id' => ['staff_id', 'staff number', 'employee id', 'emp id', 'id'],
            'employee_id' => ['employee_id', 'emp_id', 'id'],
            'email' => ['email', 'e-mail', 'work email'],
            'full_name' => ['full name', 'name', 'employee name', 'staff name'],
            'basic_salary' => ['basic salary', 'basic', 'base salary', 'base pay'],
            'house_rent' => ['house rent', 'housing', 'rent allowance', 'hra'],
            'medical_allowance' => ['medical', 'medical allowance', 'health allowance'],
            'conveyance_allowance' => ['conveyance', 'transport', 'transport allowance', 'travel allowance'],
            'other_allowance' => ['other allowance', 'misc allowance', 'additional allowance'],
            'leave_allowance' => ['leave allowance', 'leave pay'],
            'bonus' => ['bonus', 'performance bonus', 'incentive'],
            'overtime' => ['overtime', 'ot pay', 'overtime pay'],
            'tax_deduction' => ['tax', 'paye', 'paye tax', 'income tax'],
            'provident_fund_deduction' => ['provident fund', 'pf', 'pension', 'pf deduction'],
            'loan_deduction' => ['loan', 'loan deduction', 'loan repayment'],
            'other_deduction' => ['other deduction', 'misc deduction'],
        ];

        $suggestions = [];
        foreach ($headers as $header) {
            $normalized = strtolower(trim($header));
            $bestMatch = null;
            $bestScore = 0;

            foreach ($fieldMap as $field => $aliases) {
                foreach ($aliases as $alias) {
                    similar_text($normalized, strtolower($alias), $score);
                    if ($score > $bestScore && $score > 60) {
                        $bestScore = $score;
                        $bestMatch = $field;
                    }
                }
            }

            if ($template && $template->mappings) {
                foreach ($template->mappings as $mapping) {
                    if (strtolower($mapping['excel_column']) === $normalized) {
                        $bestMatch = $mapping['payroll_field'];
                        $bestScore = 100;
                        break;
                    }
                }
            }

            $suggestions[] = [
                'excel_column' => $header,
                'suggested_field' => $bestMatch,
                'confidence' => $bestScore > 80 ? 'high' : ($bestScore > 60 ? 'medium' : 'low'),
            ];
        }

        return $suggestions;
    }

    private function findEmployeeByIdentifier(string $value, string $field): ?Employee
    {
        return match ($field) {
            'staff_id' => Employee::where('staff_id', $value)->first(),
            'email' => Employee::where('email', $value)->first(),
            'employee_id' => Employee::find($value),
            'full_name' => Employee::where('full_name', $value)->first(),
            default => null,
        };
    }

    private function applyExcelDataToPayrollItem(
        PayrollItem $item,
        array $mappedData,
        $assignment,
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        string $prorationMethod,
        bool $applyAttendancePenalties,
        int $batchId
    ): void {
        $basicSalary = (float) ($mappedData['basic_salary'] ?? $assignment->basic_salary);
        $allowanceTotal = 0;
        $allowanceDetails = [];

        $earningFields = ['house_rent', 'medical_allowance', 'conveyance_allowance', 'other_allowance', 'leave_allowance', 'bonus', 'overtime'];
        foreach ($earningFields as $field) {
            if (isset($mappedData[$field])) {
                $amount = (float) $mappedData[$field];
                $allowanceTotal += $amount;
                $allowanceDetails[$field] = $amount;
            } elseif ($assignment->{$field} ?? null) {
                $amount = (float) $assignment->{$field};
                $allowanceTotal += $amount;
                $allowanceDetails[$field] = $amount;
            }
        }

        $prorationFactor = 1.0;
        $proratedBasic = $basicSalary;
        $proratedAllowances = $allowanceDetails;

        $hireDate = $item->employee?->hired_at ? CarbonImmutable::parse($item->employee->hired_at) : null;
        $terminationDate = $item->employee?->termination_date ? CarbonImmutable::parse($item->employee->termination_date) : null;

        $needsProration = false;
        $prorationReason = null;

        if ($hireDate && $hireDate->gt($periodStart) && $hireDate->lte($periodEnd)) {
            $needsProration = true;
            $prorationReason = 'mid_month_join';
            $effectiveStart = $hireDate;
        } elseif ($terminationDate && $terminationDate->gte($periodStart) && $terminationDate->lt($periodEnd)) {
            $needsProration = true;
            $prorationReason = 'mid_month_termination';
            $effectiveEnd = $terminationDate;
        }

        if ($needsProration) {
            $calendarDaysInPeriod = $periodStart->diffInDays($periodEnd) + 1;
            $workingDaysInPeriod = $this->calculateWorkingDays($periodStart, $periodEnd);

            if ($prorationMethod === 'working_days') {
                if ($prorationReason === 'mid_month_join') {
                    $eligibleDays = $this->calculateWorkingDays($effectiveStart, $periodEnd);
                } else {
                    $eligibleDays = $this->calculateWorkingDays($periodStart, $effectiveEnd);
                }
            } else {
                if ($prorationReason === 'mid_month_join') {
                    $eligibleDays = $effectiveStart->diffInDays($periodEnd) + 1;
                } else {
                    $eligibleDays = $periodStart->diffInDays($effectiveEnd) + 1;
                }
            }

            $prorationFactor = $eligibleDays / ($prorationMethod === 'working_days' ? $workingDaysInPeriod : $calendarDaysInPeriod);
            $proratedBasic = round($basicSalary * $prorationFactor, 2);

            foreach ($proratedAllowances as $field => $amount) {
                $proratedAllowances[$field] = round($amount * $prorationFactor, 2);
            }
            $allowanceTotal = array_sum($proratedAllowances);

            EmployeeProrationRecord::create([
                'payroll_item_id' => $item->id,
                'payroll_run_id' => $item->payroll_run_id,
                'employee_id' => $item->employee_id,
                'proration_reason' => $prorationReason,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'effective_start' => ($effectiveStart ?? null)?->toDateString(),
                'effective_end' => ($effectiveEnd ?? null)?->toDateString(),
                'calendar_days_in_period' => $calendarDaysInPeriod,
                'working_days_in_period' => $workingDaysInPeriod,
                'eligible_days' => $eligibleDays,
                'calculation_method' => $prorationMethod,
                'full_basic_salary' => $basicSalary,
                'prorated_basic_salary' => $proratedBasic,
                'proration_factor' => $prorationFactor,
                'affected_allowances' => $allowanceDetails,
                'affected_deductions' => [],
                'notes' => "Prorated due to {$prorationReason} on ".($effectiveStart ?? $effectiveEnd)?->format('Y-m-d'),
            ]);

            PayrollAdjustment::create([
                'payroll_item_id' => $item->id,
                'payroll_run_id' => $item->payroll_run_id,
                'employee_id' => $item->employee_id,
                'field_name' => 'basic_salary',
                'field_category' => 'earning',
                'original_value' => $basicSalary,
                'adjusted_value' => $proratedBasic,
                'difference' => $proratedBasic - $basicSalary,
                'reason' => "Automatic proration: {$prorationReason} (".($prorationFactor * 100).'% of period)',
                'adjusted_by' => $item->payrollRun?->processed_by ?? 0,
                'is_system_generated' => true,
            ]);
        }

        $bonusTotal = (float) ($mappedData['bonus'] ?? 0);

        $loanDeduction = (float) ($mappedData['loan_deduction'] ?? 0);
        $taxDeduction = (float) ($mappedData['tax_deduction'] ?? 0);
        $pfDeduction = (float) ($mappedData['provident_fund_deduction'] ?? 0);
        $otherDeduction = (float) ($mappedData['other_deduction'] ?? 0);

        $attendancePenalty = 0;
        if ($applyAttendancePenalties) {
            $attendancePenalty = $this->calculateAttendancePenalties($item->employee_id, $periodStart, $periodEnd, $proratedBasic);
            if ($attendancePenalty > 0) {
                $otherDeduction += $attendancePenalty;

                PayrollAdjustment::create([
                    'payroll_item_id' => $item->id,
                    'payroll_run_id' => $item->payroll_run_id,
                    'employee_id' => $item->employee_id,
                    'field_name' => 'attendance_penalty',
                    'field_category' => 'deduction',
                    'original_value' => 0,
                    'adjusted_value' => $attendancePenalty,
                    'difference' => $attendancePenalty,
                    'reason' => 'Automatic attendance penalty (lateness/absence)',
                    'adjusted_by' => $item->payrollRun?->processed_by ?? 0,
                    'is_system_generated' => true,
                ]);
            }
        }

        $gross = $proratedBasic + $allowanceTotal + $bonusTotal;
        $totalDeduction = $loanDeduction + $taxDeduction + $pfDeduction + $otherDeduction + $attendancePenalty;
        $netPayable = max(0, $gross - $totalDeduction);

        $item->update([
            'basic_salary' => $proratedBasic,
            'allowance_total' => $allowanceTotal,
            'bonus_total' => $bonusTotal,
            'loan_deduction' => $loanDeduction,
            'other_deduction' => $otherDeduction,
            'provident_fund_deduction' => $pfDeduction,
            'tax_deduction' => $taxDeduction,
            'total_deduction' => $totalDeduction,
            'net_payable' => $netPayable,
        ]);

        $item->deductions()->delete();
        if ($loanDeduction > 0) {
            PayrollItemDeduction::create([
                'payroll_item_id' => $item->id,
                'deduction_type' => 'loan',
                'amount' => $loanDeduction,
                'reason' => 'Loan repayment from Excel import',
            ]);
        }
        if ($taxDeduction > 0) {
            PayrollItemDeduction::create([
                'payroll_item_id' => $item->id,
                'deduction_type' => 'tax',
                'amount' => $taxDeduction,
                'reason' => 'PAYE tax from Excel import',
            ]);
        }
        if ($pfDeduction > 0) {
            PayrollItemDeduction::create([
                'payroll_item_id' => $item->id,
                'deduction_type' => 'provident_fund',
                'amount' => $pfDeduction,
                'reason' => 'Provident fund from Excel import',
            ]);
        }
        if ($attendancePenalty > 0) {
            PayrollItemDeduction::create([
                'payroll_item_id' => $item->id,
                'deduction_type' => 'other',
                'amount' => $attendancePenalty,
                'reason' => 'Attendance penalty (auto-calculated)',
            ]);
        }
    }

    private function applyAdjustmentToPayrollItem(PayrollItem $item, string $fieldName, string $fieldCategory, float $adjustedValue): void
    {
        $currentValue = match ($fieldName) {
            'basic_salary' => $item->basic_salary,
            'house_rent', 'medical_allowance', 'conveyance_allowance', 'other_allowance', 'leave_allowance', 'bonus', 'overtime' => $item->allowance_total,
            'loan_deduction' => $item->loan_deduction,
            'tax_deduction' => $item->tax_deduction,
            'provident_fund_deduction' => $item->provident_fund_deduction,
            'other_deduction' => $item->other_deduction,
            default => 0,
        };

        if ($fieldCategory === 'earning' && in_array($fieldName, ['basic_salary', 'house_rent', 'medical_allowance', 'conveyance_allowance', 'other_allowance', 'leave_allowance', 'bonus', 'overtime'])) {
            if ($fieldName === 'basic_salary') {
                $item->basic_salary = $adjustedValue;
            } else {
                $item->allowance_total = $adjustedValue;
            }
        } elseif ($fieldCategory === 'deduction') {
            match ($fieldName) {
                'loan_deduction' => $item->loan_deduction = $adjustedValue,
                'tax_deduction' => $item->tax_deduction = $adjustedValue,
                'provident_fund_deduction' => $item->provident_fund_deduction = $adjustedValue,
                'other_deduction' => $item->other_deduction = $adjustedValue,
                'attendance_penalty' => $item->other_deduction = $adjustedValue,
            };
        }

        $gross = $item->basic_salary + $item->allowance_total + $item->bonus_total;
        $totalDeduction = $item->loan_deduction + $item->other_deduction + $item->provident_fund_deduction + $item->tax_deduction;
        $item->total_deduction = $totalDeduction;
        $item->net_payable = max(0, $gross - $totalDeduction);
        $item->save();
    }

    private function calculateWorkingDays(CarbonImmutable $start, CarbonImmutable $end): int
    {
        $days = 0;
        $current = $start->copy();
        while ($current->lte($end)) {
            if (! $current->isWeekend()) {
                $days++;
            }
            $current->addDay();
        }

        return $days;
    }

    private function calculateAttendancePenalties(int $employeeId, CarbonImmutable $periodStart, CarbonImmutable $periodEnd, float $basicSalary): float
    {
        $dailyRate = $basicSalary / 30;

        $latenessRule = AttendancePenaltyRule::where('penalty_type', 'lateness')
            ->where('is_active', true)
            ->first();

        $absenceRule = AttendancePenaltyRule::where('penalty_type', 'unapproved_absence')
            ->where('is_active', true)
            ->first();

        $unpaidLeaveRule = AttendancePenaltyRule::where('penalty_type', 'unpaid_leave')
            ->where('is_active', true)
            ->first();

        $totalPenalty = 0;

        if ($latenessRule) {
            $lateRecords = AttendanceRecord::where('employee_id', $employeeId)
                ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                ->where('status', 'late')
                ->get();

            $lateCount = $lateRecords->count();
            $graceMinutes = $latenessRule->grace_period_minutes;

            if ($lateCount > 0) {
                if ($latenessRule->calculation_method === 'fixed_per_incident') {
                    $totalPenalty += $lateCount * (float) $latenessRule->amount_per_incident;
                } elseif ($latenessRule->calculation_method === 'percentage_of_daily_rate') {
                    $totalPenalty += $lateCount * ($dailyRate * (float) $latenessRule->percentage_of_daily_rate / 100);
                }
            }
        }

        if ($absenceRule) {
            $absentRecords = AttendanceRecord::where('employee_id', $employeeId)
                ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                ->where('status', 'absent')
                ->get();

            $absentCount = $absentRecords->count();

            if ($absentCount > 0) {
                if ($absenceRule->calculation_method === 'fixed_per_incident') {
                    $totalPenalty += $absentCount * (float) $absenceRule->amount_per_incident;
                } elseif ($absenceRule->calculation_method === 'percentage_of_daily_rate') {
                    $totalPenalty += $absentCount * ($dailyRate * (float) $absenceRule->percentage_of_daily_rate / 100);
                }
            }
        }

        if ($unpaidLeaveRule) {
            $unpaidLeaves = LeaveRequest::where('employee_id', $employeeId)
                ->whereBetween('start_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                ->where('leave_type', 'unpaid')
                ->where('status', 'approved')
                ->get();

            $unpaidDays = $unpaidLeaves->sum('total_days');

            if ($unpaidDays > 0) {
                if ($unpaidLeaveRule->calculation_method === 'fixed_per_incident') {
                    $totalPenalty += $unpaidDays * (float) $unpaidLeaveRule->amount_per_incident;
                } elseif ($unpaidLeaveRule->calculation_method === 'percentage_of_daily_rate') {
                    $totalPenalty += $unpaidDays * ($dailyRate * (float) $unpaidLeaveRule->percentage_of_daily_rate / 100);
                }
            }
        }

        return round($totalPenalty, 2);
    }

    private function authorizeRole(Request $request, array $roles): void
    {
        abort_unless(in_array($request->user()->role, $roles, true), 403, 'Unauthorized access.');
    }
}
