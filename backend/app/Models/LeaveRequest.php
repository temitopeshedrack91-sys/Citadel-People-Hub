<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

class LeaveRequest extends Model
{
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

    protected static function booted(): void
    {
        static::saving(function (self $record) {
            $hasType = Schema::hasColumn('leave_requests', 'type');
            $hasDays = Schema::hasColumn('leave_requests', 'days_requested');

            if ($hasType && $record->leave_type && ! $record->type) {
                $record->type = $record->leave_type;
            } elseif ($hasType && $record->type && ! $record->leave_type) {
                $record->leave_type = $record->type;
            }
            if ($hasDays && $record->total_days && ! $record->days_requested) {
                $record->days_requested = $record->total_days;
            } elseif ($hasDays && $record->days_requested && ! $record->total_days) {
                $record->total_days = $record->days_requested;
            }
            if ($record->created_at && ! $record->applied_date) {
                $record->applied_date = $record->created_at;
            }
        });
    }
}
