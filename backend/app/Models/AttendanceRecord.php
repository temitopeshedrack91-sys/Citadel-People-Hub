<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'employee_id', 'employee_staff_id', 'employee_name', 'entity_name', 'department_name',
        'date', 'clock_in_time', 'clock_out_time', 'duration_hours', 'status',
        'verification_source', 'device_id', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'clock_in_time' => 'datetime',
            'clock_out_time' => 'datetime',
            'duration_hours' => 'decimal:2',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
