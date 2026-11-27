<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeLifecycleEvent extends Model
{
    protected $fillable = [
        'employee_id',
        'employee_staff_id',
        'employee_name',
        'event_type',
        'trigger_reason',
        'initiated_by_name',
        'status',
        'details',
        'approved_by_name',
        'approved_at',
    ];

    protected $casts = [
        'details' => 'array',
        'approved_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
