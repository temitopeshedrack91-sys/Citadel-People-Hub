<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalaryTemplate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'pay_frequency',
        'basic_salary',
        'house_rent',
        'medical_allowance',
        'conveyance_allowance',
        'other_allowance',
        'provident_fund_percent',
        'tax_percent',
        'notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:2',
            'house_rent' => 'decimal:2',
            'medical_allowance' => 'decimal:2',
            'conveyance_allowance' => 'decimal:2',
            'other_allowance' => 'decimal:2',
            'provident_fund_percent' => 'decimal:2',
            'tax_percent' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    protected $appends = [
        'allowances',
        'deductions',
    ];

    public function getAllowancesAttribute(): array
    {
        $allowances = [
            ['name' => 'Housing Allowance', 'amount' => (float) ($this->house_rent ?? 0)],
            ['name' => 'Medical Allowance', 'amount' => (float) ($this->medical_allowance ?? 0)],
            ['name' => 'Transport Allowance', 'amount' => (float) ($this->conveyance_allowance ?? 0)],
            ['name' => 'Other Allowance', 'amount' => (float) ($this->other_allowance ?? 0)],
        ];
        return array_values(array_filter($allowances, fn ($a) => $a['amount'] > 0));
    }

    public function getDeductionsAttribute(): array
    {
        $deductions = [
            ['name' => 'Pension Contribution (8%)', 'amount' => (float) ($this->provident_fund_percent ?? 0), 'is_percentage' => true],
            ['name' => 'PAYE Tax', 'amount' => (float) ($this->tax_percent ?? 0), 'is_percentage' => true],
        ];
        return array_values(array_filter($deductions, fn ($d) => $d['amount'] > 0));
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(EmployeeSalaryTemplate::class);
    }
}
