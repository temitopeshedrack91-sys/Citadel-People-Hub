<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

class AttendanceRecord extends Model
{
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

    protected static function booted(): void
    {
        static::saving(function (self $record) {
            $hasClockIn = Schema::hasColumn('attendance_records', 'clock_in');
            $hasClockOut = Schema::hasColumn('attendance_records', 'clock_out');

            if ($hasClockIn && $record->clock_in_time && ! $record->clock_in) {
                $record->clock_in = $record->clock_in_time;
            } elseif ($hasClockIn && $record->clock_in && ! $record->clock_in_time) {
                $record->clock_in_time = $record->clock_in;
            }
            if ($hasClockOut && $record->clock_out_time && ! $record->clock_out) {
                $record->clock_out = $record->clock_out_time;
            } elseif ($hasClockOut && $record->clock_out && ! $record->clock_out_time) {
                $record->clock_out_time = $record->clock_out;
            }
        });
    }
}
