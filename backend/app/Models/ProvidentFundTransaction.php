<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProvidentFundTransaction extends Model
{
    protected $fillable = [
        'employee_id',
        'payroll_run_id',
        'reference_no',
        'transaction_date',
        'transaction_type',
        'employee_contribution',
        'employer_contribution',
        'adjustment_amount',
        'withdrawal_amount',
        'balance_after',
        'reason',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date:Y-m-d',
            'employee_contribution' => 'decimal:2',
            'employer_contribution' => 'decimal:2',
            'adjustment_amount' => 'decimal:2',
            'withdrawal_amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
