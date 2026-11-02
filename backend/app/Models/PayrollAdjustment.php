<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollAdjustment extends Model
{
    protected $fillable = [
        'payroll_item_id',
        'payroll_run_id',
        'employee_id',
        'field_name',
        'field_category',
        'original_value',
        'adjusted_value',
        'difference',
        'reason',
        'adjusted_by',
        'adjusted_at',
        'is_system_generated',
    ];

    protected function casts(): array
    {
        return [
            'original_value' => 'decimal:2',
            'adjusted_value' => 'decimal:2',
            'difference' => 'decimal:2',
            'adjusted_at' => 'datetime',
            'is_system_generated' => 'boolean',
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

    public function adjuster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }
}
