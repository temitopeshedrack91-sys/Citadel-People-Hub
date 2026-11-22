<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimesheetItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'timesheet_id',
        'project_id',
        'activity_name',
        'date',
        'duration_hours',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'duration_hours' => 'decimal:2',
    ];

    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(Timesheet::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
