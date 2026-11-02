<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeProrationRecord extends Model
{
    protected $fillable = [
        'payroll_item_id',
        'payroll_run_id',
        'employee_id',
        'proration_reason',
        'period_start',
        'period_end',
        'effective_start',
        'effective_end',
        'calendar_days_in_period',
        'working_days_in_period',
        'eligible_days',
        'calculation_method',
        'full_basic_salary',
        'prorated_basic_salary',
        'proration_factor',
        'affected_allowances',
        'affected_deductions',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
            'effective_start' => 'date:Y-m-d',
            'effective_end' => 'date:Y-m-d',
            'full_basic_salary' => 'decimal:2',
            'prorated_basic_salary' => 'decimal:2',
            'proration_factor' => 'decimal:6',
            'affected_allowances' => 'array',
            'affected_deductions' => 'array',
        ];
    }

    public function payrollItem(): BelongsTo
    {
        return $this->belongsTo(PayrollItem::class, 'payroll_item_id');
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
