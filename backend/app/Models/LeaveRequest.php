<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'employee_id', 'employee_staff_id', 'employee_name', 'entity_name', 'department_name',
        'leave_type', 'start_date', 'end_date', 'total_days', 'reason', 'relieving_staff_id',
        'relieving_staff_name', 'handover_colleague', 'status', 'applied_date',
        'approval_stage', 'approver_comments', 'approval_history',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'applied_date' => 'datetime',
            'approval_history' => 'array',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
