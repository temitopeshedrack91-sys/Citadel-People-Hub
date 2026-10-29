<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollItem extends Model
{
    protected $fillable = [
        'payroll_run_id',
        'employee_id',
        'pay_frequency',
        'basic_salary',
        'allowance_total',
        'bonus_total',
        'loan_deduction',
        'other_deduction',
        'provident_fund_deduction',
        'employer_pf_contribution',
        'tax_deduction',
        'total_deduction',
        'net_payable',
        'payment_status',
        'payment_reference',
    ];

    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:2',
            'allowance_total' => 'decimal:2',
            'bonus_total' => 'decimal:2',
            'loan_deduction' => 'decimal:2',
            'other_deduction' => 'decimal:2',
            'provident_fund_deduction' => 'decimal:2',
            'employer_pf_contribution' => 'decimal:2',
            'tax_deduction' => 'decimal:2',
            'total_deduction' => 'decimal:2',
            'net_payable' => 'decimal:2',
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(PayrollItemDeduction::class);
    }
}
