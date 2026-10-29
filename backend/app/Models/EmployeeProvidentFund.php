<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeProvidentFund extends Model
{
    protected $fillable = [
        'employee_id',
        'employee_contribution_percent',
        'employer_contribution_percent',
        'opening_balance',
        'effective_from',
    ];

    protected function casts(): array
    {
        return [
            'employee_contribution_percent' => 'decimal:2',
            'employer_contribution_percent' => 'decimal:2',
            'opening_balance' => 'decimal:2',
            'effective_from' => 'date:Y-m-d',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
