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

    public function assignments(): HasMany
    {
        return $this->hasMany(EmployeeSalaryTemplate::class);
    }
}
