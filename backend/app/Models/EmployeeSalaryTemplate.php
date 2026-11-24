<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeSalaryTemplate extends Model
{
    protected $fillable = [
        'employee_id',
        'salary_template_id',
        'pay_frequency',
        'basic_salary',
        'house_rent',
        'medical_allowance',
        'conveyance_allowance',
        'other_allowance',
        'gross_salary',
        'provident_fund_percent',
        'tax_percent',
        'ctc_amount',
        'notes',
        'effective_from',
        'effective_to',
    ];

    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:2',
            'house_rent' => 'decimal:2',
            'medical_allowance' => 'decimal:2',
            'conveyance_allowance' => 'decimal:2',
            'other_allowance' => 'decimal:2',
            'gross_salary' => 'decimal:2',
            'provident_fund_percent' => 'decimal:2',
            'tax_percent' => 'decimal:2',
            'ctc_amount' => 'decimal:2',
            'effective_from' => 'date:Y-m-d',
            'effective_to' => 'date:Y-m-d',
        ];
    }

    protected $appends = [
        'effective_date',
        'is_active',
    ];

    public function getEffectiveDateAttribute(): ?string
    {
        return $this->effective_from ? (is_string($this->effective_from) ? $this->effective_from : $this->effective_from->format('Y-m-d')) : null;
    }

    public function getIsActiveAttribute(): bool
    {
        return empty($this->effective_to) || (is_string($this->effective_to) ? $this->effective_to : $this->effective_to->format('Y-m-d')) >= date('Y-m-d');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function salaryTemplate(): BelongsTo
    {
        return $this->belongsTo(SalaryTemplate::class);
    }
}
