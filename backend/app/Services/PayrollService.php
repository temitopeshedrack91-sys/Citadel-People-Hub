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

class PayrollService
{
    /**
     * Create or update a salary template with allowance and statutory rate configurations.
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
     * Record a discretionary or performance bonus for an employee.
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
     * Register or update an employee recurring/one-time deduction.
     */
    public function saveDeduction(array $payload, ?EmployeeDeduction $deduction = null): EmployeeDeduction
    {
        $deduction ??= new EmployeeDeduction;
        $deduction->fill($payload);
        $deduction->save();

        return $deduction;
    }

    /**
     * Configure statutory Provident Fund / Pension parameters.
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
     * Submit a loan application on behalf of an employee requiring approval.
     */
    public function applyLoan(array $payload, int $userId): EmployeeLoan
    {
        $payload['status'] = 'pending_supervisor';
        $payload['applied_by'] = $userId;

        return $this->saveLoan($payload);
    }

    /**
     * Multi-step loan approval (supervisor or final management sign-off).
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
     * Reschedule unpaid loan terms.
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
