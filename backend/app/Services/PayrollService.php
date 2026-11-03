<?php

namespace App\Services;

use App\Models\Bonus;
use App\Models\Employee;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeLoan;
use App\Models\EmployeeProvidentFund;
use App\Models\EmployeeSalaryTemplate;
use App\Models\LoanInstallment;
use App\Models\PayrollItem;
use App\Models\PayrollItemDeduction;
use App\Models\PayrollRun;
use App\Models\ProvidentFundTransaction;
use App\Models\SalaryTemplate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Payroll Service
 *
 * Core computation engine and ledger orchestration for Citadel People Hub payroll.
 * Handles salary structure definitions, effective-dated employee compensation
 * assignments, automated amortized loan schedules, statutory deductions (PAYE tax,
 * pension / provident fund), and idempotent draft payroll run generation and finalization.
 */
class PayrollService
{
    /**
     * Create or update a reusable salary template defining base earnings and statutory defaults.
     *
     * @param  array{name: string, pay_frequency?: string, basic_salary: numeric, house_rent?: numeric, medical_allowance?: numeric, conveyance_allowance?: numeric, other_allowance?: numeric, provident_fund_percent?: numeric, tax_percent?: numeric, is_active?: bool}  $payload  Template configuration attributes.
     * @param  SalaryTemplate|null  $template  Existing model instance if performing an update.
     * @return SalaryTemplate The persisted salary structure template.
     */
    public function saveSalaryTemplate(array $payload, ?SalaryTemplate $template = null): SalaryTemplate
    {
        $payload = array_merge([
            'house_rent' => 0,
            'medical_allowance' => 0,
            'conveyance_allowance' => 0,
            'other_allowance' => 0,
            'provident_fund_percent' => 0,
            'tax_percent' => 0,
            'is_active' => true,
        ], array_filter($payload, fn ($v) => $v !== null && $v !== ''));

        $template ??= new SalaryTemplate;
        $template->fill($payload);
        $template->save();

        return $template;
    }

    /**
     * Assign a salary structure to an employee with effective date intervals and overlap prevention.
     *
     * Automatically closes prior open-ended assignments before the new start date,
     * checks for date collisions against existing historical records, and computes gross salary.
     *
     * @param  array{employee_id: int|string, salary_template_id: int|string, effective_from: string, effective_to?: string|null, basic_salary: numeric, house_rent?: numeric, medical_allowance?: numeric, conveyance_allowance?: numeric, other_allowance?: numeric, provident_fund_percent?: numeric, tax_percent?: numeric, ctc_amount?: numeric|null, notes?: string|null, pay_frequency?: string}  $payload
     * @return EmployeeSalaryTemplate The assigned effective salary structure record.
     *
     * @throws InvalidArgumentException If the effective date range overlaps with an existing structure.
     */
    public function assignSalaryTemplate(array $payload): EmployeeSalaryTemplate
    {
        $employee = Employee::query()->findOrFail((int) $payload['employee_id']);

        $payload = array_merge([
            'pay_frequency' => 'monthly',
            'house_rent' => 0,
            'medical_allowance' => 0,
            'conveyance_allowance' => 0,
            'other_allowance' => 0,
            'provident_fund_percent' => 0,
            'tax_percent' => 0,
            'ctc_amount' => null,
            'notes' => null,
            'effective_to' => null,
        ], array_filter($payload, fn ($v) => $v !== null && $v !== ''));

        $effectiveFrom = CarbonImmutable::parse($payload['effective_from']);
        $effectiveTo = ! empty($payload['effective_to']) ? CarbonImmutable::parse($payload['effective_to']) : null;

        $grossSalary = (float) $payload['basic_salary']
            + (float) $payload['house_rent']
            + (float) $payload['medical_allowance']
            + (float) $payload['conveyance_allowance']
            + (float) $payload['other_allowance'];

        return DB::transaction(function () use ($payload, $effectiveFrom, $effectiveTo, $grossSalary, $employee) {
            $effectiveFromDate = $effectiveFrom->toDateString();
            $effectiveToDate = $effectiveTo?->toDateString();

            // Close prior open-ended assignments before the new start date
            EmployeeSalaryTemplate::query()
                ->where('employee_id', $employee->id)
                ->where('effective_from', '<', $effectiveFromDate)
                ->where(function ($query) use ($effectiveFromDate) {
                    $query->whereNull('effective_to')->orWhere('effective_to', '>=', $effectiveFromDate);
                })
                ->update([
                    'effective_to' => $effectiveFrom->subDay()->toDateString(),
                    'updated_at' => now(),
                ]);

            // Check for illegal overlaps
            $overlap = EmployeeSalaryTemplate::query()
                ->where('employee_id', $employee->id)
                ->where('effective_from', '!=', $effectiveFromDate)
                ->where('effective_from', '<=', $effectiveToDate ?? '9999-12-31')
                ->where(function ($query) use ($effectiveFromDate) {
                    $query->whereNull('effective_to')->orWhere('effective_to', '>=', $effectiveFromDate);
                })
                ->exists();

            if ($overlap) {
                throw new InvalidArgumentException('Employee salary assignment dates overlap with an existing structure.');
            }

            return EmployeeSalaryTemplate::query()->updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'effective_from' => $effectiveFromDate,
                ],
                [
                    'salary_template_id' => (int) $payload['salary_template_id'],
                    'pay_frequency' => $payload['pay_frequency'] ?: 'monthly',
                    'basic_salary' => $payload['basic_salary'],
                    'house_rent' => $payload['house_rent'],
                    'medical_allowance' => $payload['medical_allowance'],
                    'conveyance_allowance' => $payload['conveyance_allowance'],
                    'other_allowance' => $payload['other_allowance'],
                    'gross_salary' => $grossSalary,
                    'provident_fund_percent' => $payload['provident_fund_percent'],
                    'tax_percent' => $payload['tax_percent'],
                    'ctc_amount' => $payload['ctc_amount'],
                    'notes' => $payload['notes'],
                    'effective_to' => $effectiveToDate,
                ]
            );
        });
    }

    /**
     * Record a discretionary or performance bonus for an employee within a cycle.
     *
     * @param  array{employee_id: int|string, bonus_name: string, amount: numeric, bonus_date: string, remarks?: string|null}  $payload
     * @param  int  $userId  ID of the authenticated administrator recording the bonus.
     * @param  Bonus|null  $bonus  Existing model instance if editing.
     * @return Bonus The saved bonus record.
     */
    public function saveBonus(array $payload, int $userId, ?Bonus $bonus = null): Bonus
    {
        $bonus ??= new Bonus(['created_by' => $userId]);
        $bonus->fill($payload);
        $bonus->created_by ??= $userId;
        $bonus->save();

        return $bonus;
    }

    /**
     * Register or update an employee recurring or one-time deduction.
     *
     * Supports fixed monetary values or percentage of base salary.
     *
     * @param  array{employee_id: int|string, deduction_type: string, calculation_type: 'flat'|'percent', amount: numeric, frequency: 'monthly'|'weekly'|'one_time', effective_from: string, effective_to?: string|null, reason?: string|null, comments?: string|null, is_active?: bool}  $payload
     * @param  EmployeeDeduction|null  $deduction  Existing deduction instance if updating.
     * @return EmployeeDeduction The persisted deduction record.
     */
    public function saveDeduction(array $payload, ?EmployeeDeduction $deduction = null): EmployeeDeduction
    {
        $deduction ??= new EmployeeDeduction;
        $deduction->fill($payload);
        $deduction->save();

        return $deduction;
    }

    /**
     * Configure statutory Provident Fund / Pension parameters for an employee.
     *
     * Sets matching employee/employer contribution percentages and initial opening balance.
     *
     * @param  array{employee_id: int|string, opening_balance?: numeric, employee_contribution_percent: numeric, employer_contribution_percent: numeric, effective_from?: string|null, account_number?: string|null, pfa_name?: string|null}  $payload
     * @return EmployeeProvidentFund The updated provident fund profile.
     */
    public function saveProvidentFund(array $payload): EmployeeProvidentFund
    {
        $payload['opening_balance'] = $payload['opening_balance'] ?? 0;

        return EmployeeProvidentFund::query()->updateOrCreate(
            ['employee_id' => (int) $payload['employee_id']],
            $payload
        );
    }

    /**
     * Save an approved employee loan with automated amortized installments.
     *
     * Computes installment amount from principal, interest rate, and term count,
     * and automatically generates loan_installments records if active.
     *
     * @param  array{employee_id: int|string, principal_amount: numeric, installment_count: int, installment_amount?: numeric, interest_rate_percent?: numeric, issued_date: string, first_installment_date?: string|null, reason?: string|null, status?: string}  $payload
     * @param  EmployeeLoan|null  $loan  Existing loan record if updating.
     * @return EmployeeLoan The persisted loan record.
     */
    public function saveLoan(array $payload, ?EmployeeLoan $loan = null): EmployeeLoan
    {
        return DB::transaction(function () use ($payload, $loan) {
            $payload['status'] = $payload['status'] ?? 'active';
            $payload['interest_rate_percent'] = $payload['interest_rate_percent'] ?? 0;
            $payload['first_installment_date'] = $payload['first_installment_date'] ?? null;
            $payload['installment_amount'] = $this->calculateInstallmentAmount($payload);

            $loan ??= new EmployeeLoan;
            $isNew = ! $loan->exists;
            $loan->fill($payload);
            $loan->save();

            if ($loan->status === 'active' && ($isNew || $loan->installments()->count() === 0)) {
                $this->createLoanInstallments($loan, $payload);
            }

            return $loan;
        });
    }

    /**
     * Submit a loan application on behalf of an employee requiring supervisor approval.
     *
     * @param  array  $payload  Loan application parameters.
     * @param  int  $userId  Authenticated applicant or manager ID.
     * @return EmployeeLoan Pending loan record.
     */
    public function applyLoan(array $payload, int $userId): EmployeeLoan
    {
        $payload['status'] = 'pending_supervisor';
        $payload['applied_by'] = $userId;

        return $this->saveLoan($payload);
    }

    /**
     * Advance a loan through its multi-step approval workflow.
     *
     * In 'supervisor' step: transitions from pending_supervisor to pending_final.
     * In 'final' step: transitions from pending_final to active, creating amortization installments.
     *
     * @param  EmployeeLoan  $loan  The target loan model.
     * @param  string  $step  Approval level: 'supervisor' or 'final'.
     * @param  int  $userId  ID of approving administrator.
     * @param  string|null  $remarks  Optional approval remarks or conditions.
     * @return EmployeeLoan The updated loan record.
     *
     * @throws InvalidArgumentException If the loan status is incompatible with the requested step.
     */
    public function approveLoan(EmployeeLoan $loan, string $step, int $userId, ?string $remarks = null): EmployeeLoan
    {
        return DB::transaction(function () use ($loan, $step, $userId, $remarks) {
            $locked = EmployeeLoan::query()->lockForUpdate()->findOrFail($loan->id);

            if ($step === 'supervisor') {
                if ($locked->status !== 'pending_supervisor') {
                    throw new InvalidArgumentException('Only supervisor-pending loans can receive supervisor approval.');
                }
                $locked->update([
                    'status' => 'pending_final',
                    'supervisor_approved_by' => $userId,
                    'supervisor_approved_at' => now(),
                    'remarks' => $remarks ?: $locked->remarks,
                ]);

                return $locked->refresh();
            }

            if ($step !== 'final') {
                throw new InvalidArgumentException('Invalid loan approval step specified.');
            }

            if (! in_array($locked->status, ['pending_supervisor', 'pending_final'], true)) {
                throw new InvalidArgumentException('Only pending loans can receive final approval.');
            }

            $locked->update([
                'status' => 'active',
                'final_approved_by' => $userId,
                'final_approved_at' => now(),
                'remarks' => $remarks ?: $locked->remarks,
            ]);

            if ($locked->installments()->count() === 0) {
                $this->createLoanInstallments($locked, $locked->toArray());
            }

            return $locked->refresh();
        });
    }

    /**
     * Reject a pending loan application.
     *
     * @param  EmployeeLoan  $loan  The target loan.
     * @param  int  $userId  Administrator recording the rejection.
     * @param  string|null  $remarks  Rejection justification.
     * @return EmployeeLoan The rejected loan record.
     *
     * @throws InvalidArgumentException If the loan is not in a pending state.
     */
    public function rejectLoan(EmployeeLoan $loan, int $userId, ?string $remarks = null): EmployeeLoan
    {
        if (! in_array($loan->status, ['pending_supervisor', 'pending_final'], true)) {
            throw new InvalidArgumentException('Only pending loans can be rejected.');
        }

        $loan->update([
            'status' => 'rejected',
            'rejected_by' => $userId,
            'rejected_at' => now(),
            'remarks' => $remarks ?: $loan->remarks,
        ]);

        return $loan->refresh();
    }

    /**
     * Reschedule unpaid loan terms and regenerate amortization schedule.
     *
     * Disallowed if any installments have already been settled.
     *
     * @param  EmployeeLoan  $loan  The active loan to reschedule.
     * @param  array  $payload  New principal balance, installment count, and start date.
     * @return EmployeeLoan The rescheduled loan record.
     *
     * @throws InvalidArgumentException If one or more installments are already marked paid.
     */
    public function rescheduleLoan(EmployeeLoan $loan, array $payload): EmployeeLoan
    {
        return DB::transaction(function () use ($loan, $payload) {
            if ($loan->installments()->where('status', 'paid')->exists()) {
                throw new InvalidArgumentException('Loans with already settled installments cannot be rescheduled.');
            }

            $payload['interest_rate_percent'] = $payload['interest_rate_percent'] ?? 0;
            $payload['first_installment_date'] = $payload['first_installment_date'] ?? null;
            $payload['installment_amount'] = $this->calculateInstallmentAmount($payload);

            $loan->fill($payload);
            $loan->save();
            $loan->installments()->delete();
            $this->createLoanInstallments($loan, $payload);

            return $loan->refresh();
        });
    }

    /**
     * Generate an audit-ready draft payroll run for a target cycle (monthly or weekly).
     *
     * Identifies active employees within scope, calculates basic salary and allowances
     * from effective salary structures, incorporates bonuses within the window, and
     * calculates statutory deductions (PAYE, PF employee/employer) and loan repayments.
     *
     * @param  array{period_start: string, period_end: string, pay_frequency?: string, payroll_week?: int|null, period_label?: string|null, pay_date?: string|null, employee_id?: int|string|null, entity_id?: string|null, department_id?: int|string|null}  $payload
     * @param  int  $processedBy  ID of the administrator initiating run generation.
     * @return PayrollRun The draft payroll run with associated payslip items.
     *
     * @throws RuntimeException If the target payroll period is already finalized, or if no active employees are matched.
     */
    public function generatePayrollRun(array $payload, int $processedBy): PayrollRun
    {
        return DB::transaction(function () use ($payload) {
            $periodStart = CarbonImmutable::parse($payload['period_start']);
            $periodEnd = CarbonImmutable::parse($payload['period_end']);
            $payFrequency = $payload['pay_frequency'] ?? 'monthly';

            $run = PayrollRun::query()
                ->where('pay_frequency', $payFrequency)
                ->where('period_start', $periodStart->toDateString())
                ->where('period_end', $periodEnd->toDateString())
                ->first();

            if ($run && $run->status !== 'draft') {
                throw new RuntimeException('This payroll period has already been finalized. Please create a new period.');
            }

            if (! $run) {
                $run = PayrollRun::query()->create([
                    'pay_frequency' => $payFrequency,
                    'period_start' => $periodStart->toDateString(),
                    'period_end' => $periodEnd->toDateString(),
                ]);
            }

            // Clear draft artifacts before regeneration
            ProvidentFundTransaction::query()->where('payroll_run_id', $run->id)->delete();
            $run->items()->delete();

            $run->update([
                'payroll_year' => $periodStart->year,
                'payroll_month' => $periodStart->month,
                'payroll_week' => $payload['payroll_week'] ?? null,
                'period_label' => $payload['period_label'] ?: $periodStart->format('M Y'),
                'pay_date' => ! empty($payload['pay_date']) ? $payload['pay_date'] : null,
                'status' => 'draft',
                'gross_total' => 0,
                'deduction_total' => 0,
                'net_total' => 0,
                'processed_by' => null,
                'processed_at' => null,
            ]);

            $query = Employee::query()->where('status', 'Active');
            if (! empty($payload['employee_id'])) {
                $query->where('id', (int) $payload['employee_id']);
            }
            if (! empty($payload['entity_id'])) {
                $query->where('entity_id', $payload['entity_id']);
            }
            if (! empty($payload['department_id'])) {
                $query->where('department_id', $payload['department_id']);
            }

            $employees = $query->get();
            if ($employees->isEmpty()) {
                throw new RuntimeException('No active employees found matching the payroll scope.');
            }

            foreach ($employees as $employee) {
                $this->createPayrollItem($run, $employee, $periodStart, $periodEnd);
            }

            $this->refreshRunTotals($run);

            return $run->refresh()->load('items.employee');
        });
    }

    /**
     * Finalize payroll run: executes loan deductions, posts provident fund balances, and locks run.
     *
     * Transitions status from 'draft' to 'processed'. Marks pending loan installments
     * as paid and posts permanent provident fund ledger contribution records.
     *
     * @param  PayrollRun  $run  The draft payroll run to lock and finalize.
     * @param  int  $processedBy  ID of the authorized administrator executing finalization.
     * @return PayrollRun The finalized payroll run.
     *
     * @throws RuntimeException If the run is not in 'draft' status or contains zero payslip items.
     */
    public function finalizePayrollRun(PayrollRun $run, int $processedBy): PayrollRun
    {
        return DB::transaction(function () use ($run, $processedBy) {
            $lockedRun = PayrollRun::query()->lockForUpdate()->with('items')->findOrFail($run->id);

            if ($lockedRun->status !== 'draft') {
                throw new RuntimeException('Only draft payroll runs can be finalized.');
            }

            if ($lockedRun->items->isEmpty()) {
                throw new RuntimeException('Cannot finalize an empty payroll run with no payslips.');
            }

            ProvidentFundTransaction::query()->where('payroll_run_id', $lockedRun->id)->delete();

            foreach ($lockedRun->items as $item) {
                $this->settleLoanInstallments($lockedRun, $item);
                $this->recordProvidentFundContribution($lockedRun, $item, $processedBy);
            }

            $lockedRun->update([
                'status' => 'processed',
                'processed_by' => $processedBy,
                'processed_at' => now(),
            ]);

            return $lockedRun->refresh();
        });
    }

    /**
     * Mark an individual payslip as paid and record disbursement reference.
     *
     * @param  PayrollItem  $item  The payslip item to update.
     * @param  string|null  $paymentReference  Optional bank transfer reference or check number.
     * @return PayrollItem The updated payslip item.
     *
     * @throws RuntimeException If the parent payroll run is not yet finalized.
     */
    public function markItemPaid(PayrollItem $item, ?string $paymentReference = null): PayrollItem
    {
        $item->loadMissing('payrollRun');
        if ($item->payrollRun?->status !== 'processed') {
            throw new RuntimeException('Only finalized payroll payslips can be marked as paid.');
        }

        $item->update([
            'payment_status' => 'paid',
            'payment_reference' => $paymentReference,
        ]);

        return $item->refresh();
    }

    /**
     * Compute and create an individual payslip item for an employee within a run.
     */
    private function createPayrollItem(PayrollRun $run, Employee $employee, CarbonImmutable $periodStart, CarbonImmutable $periodEnd): PayrollItem
    {
        $assignment = $this->activeSalaryAssignment($employee->id, $periodEnd);
        if (! $assignment) {
            throw new RuntimeException("No active salary structure found for {$employee->full_name} ({$employee->staff_id}) for period {$periodStart->toDateString()} to {$periodEnd->toDateString()}.");
        }

        $basicSalary = (float) $assignment->basic_salary;
        $allowanceTotal = (float) (
            ($assignment->house_rent ?? 0) +
            ($assignment->medical_allowance ?? 0) +
            ($assignment->conveyance_allowance ?? 0) +
            ($assignment->other_allowance ?? 0)
        );

        $bonusTotal = (float) Bonus::query()
            ->where('employee_id', $employee->id)
            ->whereBetween('bonus_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->sum('amount');

        $loanDeduction = (float) LoanInstallment::query()
            ->whereHas('loan', fn ($q) => $q->where('employee_id', $employee->id)->where('status', 'active'))
            ->whereBetween('due_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->where('status', 'pending')
            ->sum('amount');

        $pf = $this->calculateProvidentFund($employee->id, $basicSalary, $assignment, $periodEnd);
        $pfDeduction = $pf['employee'];
        $pfEmployer = $pf['employer'];

        $taxPercent = (float) ($assignment->tax_percent ?? 0);
        $taxDeduction = round(($basicSalary * $taxPercent) / 100, 2);

        $item = PayrollItem::query()->create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'pay_frequency' => $run->pay_frequency,
            'basic_salary' => $basicSalary,
            'allowance_total' => $allowanceTotal,
            'bonus_total' => $bonusTotal,
            'loan_deduction' => $loanDeduction,
            'provident_fund_deduction' => $pfDeduction,
            'employer_pf_contribution' => $pfEmployer,
            'tax_deduction' => $taxDeduction,
            'payment_status' => 'pending',
        ]);

        $gross = $basicSalary + $allowanceTotal + $bonusTotal;
        $otherDeduction = $this->attachActiveDeductions($item, $employee->id, $periodStart, $periodEnd, $basicSalary, $run->pay_frequency);
        $totalDeduction = $loanDeduction + $otherDeduction + $pfDeduction + $taxDeduction;

        $item->update([
            'other_deduction' => $otherDeduction,
            'total_deduction' => $totalDeduction,
            'net_payable' => max(0, $gross - $totalDeduction),
        ]);

        return $item->refresh();
    }

    /**
     * Retrieve the active salary assignment valid on the specified target date.
     */
    private function activeSalaryAssignment(int $employeeId, CarbonImmutable $periodEnd): ?EmployeeSalaryTemplate
    {
        return EmployeeSalaryTemplate::query()
            ->where('employee_id', $employeeId)
            ->where('effective_from', '<=', $periodEnd->toDateString())
            ->where(function ($query) use ($periodEnd) {
                $query->whereNull('effective_to')->orWhere('effective_to', '>=', $periodEnd->toDateString());
            })
            ->orderByDesc('effective_from')
            ->first();
    }

    /**
     * Calculate monthly loan installment amount amortized over the installment count.
     */
    private function calculateInstallmentAmount(array $payload): float
    {
        $count = (int) ($payload['installment_count'] ?? 0);
        if ($count <= 0) {
            return round((float) ($payload['installment_amount'] ?? 0), 2);
        }

        $principal = (float) ($payload['principal_amount'] ?? 0);
        $interestPercent = (float) ($payload['interest_rate_percent'] ?? 0);
        $total = $principal + (($principal * $interestPercent) / 100);

        return round($total / $count, 2);
    }

    /**
     * Generate individual monthly loan installment records for an active loan.
     */
    private function createLoanInstallments(EmployeeLoan $loan, array $payload): void
    {
        $firstDueDate = CarbonImmutable::parse($payload['first_installment_date'] ?: $payload['issued_date']);
        $installmentAmount = $this->calculateInstallmentAmount($payload);

        for ($i = 1; $i <= (int) $payload['installment_count']; $i++) {
            LoanInstallment::query()->create([
                'employee_loan_id' => $loan->id,
                'installment_no' => $i,
                'due_date' => $firstDueDate->addMonthsNoOverflow($i - 1)->toDateString(),
                'amount' => $installmentAmount,
                'paid_amount' => 0,
                'status' => 'pending',
            ]);
        }
    }

    /**
     * Settle due loan installments during payroll finalization and auto-close loans if complete.
     */
    private function settleLoanInstallments(PayrollRun $run, PayrollItem $item): void
    {
        $installments = LoanInstallment::query()
            ->whereHas('loan', fn ($q) => $q->where('employee_id', $item->employee_id)->where('status', 'active'))
            ->whereBetween('due_date', [$run->period_start, $run->period_end])
            ->where('status', 'pending')
            ->lockForUpdate()
            ->get();

        foreach ($installments as $installment) {
            $installment->update([
                'paid_amount' => $installment->amount,
                'paid_date' => $run->pay_date ?: $run->period_end,
                'payroll_item_id' => $item->id,
                'status' => 'paid',
            ]);

            // Auto-close loan if all installments are fully settled
            $loan = $installment->loan;
            if ($loan && $loan->installments()->where('status', '!=', 'paid')->doesntExist()) {
                $loan->update(['status' => 'closed']);
            }
        }
    }

    /**
     * Compute statutory employee and employer provident fund (pension) contributions.
     *
     * @return array{employee: float, employer: float}
     */
    private function calculateProvidentFund(int $employeeId, float $basicSalary, $assignment, CarbonImmutable $periodEnd): array
    {
        $fund = EmployeeProvidentFund::query()
            ->where('employee_id', $employeeId)
            ->where(function ($query) use ($periodEnd) {
                $query->whereNull('effective_from')->orWhere('effective_from', '<=', $periodEnd->toDateString());
            })
            ->first();

        $fallback = (float) ($assignment->provident_fund_percent ?? 0);
        $empPercent = (float) ($fund?->employee_contribution_percent ?? $fallback);
        $emprPercent = (float) ($fund?->employer_contribution_percent ?? $fallback);

        return [
            'employee' => round(($basicSalary * $empPercent) / 100, 2),
            'employer' => round(($basicSalary * $emprPercent) / 100, 2),
        ];
    }

    private function recordProvidentFundContribution(PayrollRun $run, PayrollItem $item, int $processedBy): void
    {
        $empContrib = (float) $item->provident_fund_deduction;
        $emprContrib = (float) $item->employer_pf_contribution;

        if ($empContrib <= 0 && $emprContrib <= 0) {
            return;
        }

        $refNo = "PF-{$run->id}-{$item->employee_id}";
        $opening = (float) EmployeeProvidentFund::query()->where('employee_id', $item->employee_id)->value('opening_balance');

        $priorTotals = ProvidentFundTransaction::query()
            ->where('employee_id', $item->employee_id)
            ->where('transaction_date', '<=', $run->period_end)
            ->where('reference_no', '!=', $refNo)
            ->selectRaw('COALESCE(SUM(employee_contribution + employer_contribution + adjustment_amount - withdrawal_amount), 0) as total')
            ->value('total');

        $balanceAfter = round($opening + (float) $priorTotals + $empContrib + $emprContrib, 2);

        ProvidentFundTransaction::query()->updateOrCreate(
            [
                'payroll_run_id' => $run->id,
                'employee_id' => $item->employee_id,
                'reference_no' => $refNo,
            ],
            [
                'transaction_date' => $run->period_end,
                'transaction_type' => 'contribution',
                'employee_contribution' => $empContrib,
                'employer_contribution' => $emprContrib,
                'balance_after' => $balanceAfter,
                'reason' => "Automated payroll contribution for period {$run->period_label}",
                'recorded_by' => $processedBy,
            ]
        );
    }

    private function attachActiveDeductions(PayrollItem $item, int $employeeId, CarbonImmutable $start, CarbonImmutable $end, float $basicSalary, string $payFrequency): float
    {
        $deductions = EmployeeDeduction::query()
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->where('effective_from', '<=', $end->toDateString())
            ->where(function ($query) use ($start) {
                $query->whereNull('effective_to')->orWhere('effective_to', '>=', $start->toDateString());
            })
            ->where(function ($query) use ($payFrequency, $start, $end) {
                $query->where('frequency', $payFrequency)
                    ->orWhere(function ($q2) use ($start, $end) {
                        $q2->where('frequency', 'one_time')
                            ->whereBetween('effective_from', [$start->toDateString(), $end->toDateString()]);
                    });
            })
            ->get();

        $total = 0.0;
        foreach ($deductions as $deduction) {
            $amount = $deduction->calculation_type === 'percent'
                ? round(($basicSalary * (float) $deduction->amount) / 100, 2)
                : (float) $deduction->amount;

            $total += $amount;
            PayrollItemDeduction::query()->create([
                'payroll_item_id' => $item->id,
                'employee_deduction_id' => $deduction->id,
                'deduction_type' => $deduction->deduction_type,
                'amount' => $amount,
                'reason' => $deduction->reason,
                'comments' => $deduction->comments,
            ]);
        }

        return $total;
    }

    private function refreshRunTotals(PayrollRun $run): void
    {
        $run->update([
            'gross_total' => PayrollItem::query()
                ->where('payroll_run_id', $run->id)
                ->selectRaw('COALESCE(SUM(basic_salary + allowance_total + bonus_total), 0) as total')
                ->value('total'),
            'deduction_total' => $run->items()->sum('total_deduction'),
            'net_total' => $run->items()->sum('net_payable'),
        ]);
    }
}
