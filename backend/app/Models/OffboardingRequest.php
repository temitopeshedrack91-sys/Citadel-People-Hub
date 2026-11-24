<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OffboardingRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'employee_id',
        'manager_id',
        'manager_name',
        'resignation_date',
        'proposed_last_day',
        'notice_period_days',
        'notice_compliant',
        'reason',
        'manager_endorsed',
        'manager_endorsed_by_id',
        'manager_endorsed_at',
        'manager_comments',
        'hr_verified',
        'hr_verified_by_id',
        'hr_verified_at',
        'contract_notes',
        'status',
        'exit_interview',
        'clearances',
        'clearance_notes',
        'final_settled_at',
        'final_settled_by_id',
        'settlement_notes',
        'created_by_user_id',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'resignation_date' => 'date:Y-m-d',
            'proposed_last_day' => 'date:Y-m-d',
            'notice_period_days' => 'integer',
            'notice_compliant' => 'boolean',
            'manager_endorsed' => 'boolean',
            'manager_endorsed_at' => 'datetime',
            'hr_verified' => 'boolean',
            'hr_verified_at' => 'datetime',
            'exit_interview' => 'array',
            'clearances' => 'array',
            'clearance_notes' => 'array',
            'final_settled_at' => 'datetime',
            'version' => 'integer',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function managerEndorser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_endorsed_by_id');
    }

    public function hrVerifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hr_verified_by_id');
    }

    public function finalSettler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'final_settled_by_id');
    }
}
