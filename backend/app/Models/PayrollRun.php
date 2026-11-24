<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    protected $fillable = [
        'pay_frequency',
        'payroll_year',
        'payroll_month',
        'payroll_week',
        'period_label',
        'period_start',
        'period_end',
        'pay_date',
        'status',
        'gross_total',
        'deduction_total',
        'net_total',
        'processed_by',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
            'pay_date' => 'date:Y-m-d',
            'gross_total' => 'decimal:2',
            'deduction_total' => 'decimal:2',
            'net_total' => 'decimal:2',
            'processed_at' => 'datetime',
        ];
    }

    protected $appends = [
        'run_number',
        'title',
        'total_gross',
        'total_deduction',
        'total_net',
    ];

    public function getRunNumberAttribute(): string
    {
        $year = $this->payroll_year ?: date('Y');
        return "PR-{$year}-" . str_pad((string) $this->id, 3, '0', STR_PAD_LEFT);
    }

    public function getTitleAttribute(): string
    {
        return $this->period_label ?: "Payroll Run ({$this->period_start} - {$this->period_end})";
    }

    public function getTotalGrossAttribute(): float
    {
        return (float) ($this->gross_total ?? 0);
    }

    public function getTotalDeductionAttribute(): float
    {
        return (float) ($this->deduction_total ?? 0);
    }

    public function getTotalNetAttribute(): float
    {
        return (float) ($this->net_total ?? 0);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
