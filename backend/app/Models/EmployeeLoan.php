<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployeeLoan extends Model
{
    protected $fillable = [
        'employee_id',
        'loan_reference',
        'principal_amount',
        'interest_rate_percent',
        'installment_count',
        'installment_amount',
        'issued_date',
        'first_installment_date',
        'status',
        'applied_by',
        'supervisor_approved_by',
        'supervisor_approved_at',
        'final_approved_by',
        'final_approved_at',
        'rejected_by',
        'rejected_at',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'principal_amount' => 'decimal:2',
            'interest_rate_percent' => 'decimal:2',
            'installment_amount' => 'decimal:2',
            'issued_date' => 'date:Y-m-d',
            'first_installment_date' => 'date:Y-m-d',
            'supervisor_approved_at' => 'datetime',
            'final_approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(LoanInstallment::class);
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }
}
