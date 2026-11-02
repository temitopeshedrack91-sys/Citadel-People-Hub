<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    protected $fillable = [
        'project_id',
        'department_id',
        'title',
        'description',
        'priority',
        'status',
        'due_date',
        'assigned_to_employee_id',
        'created_by_employee_id',
        'labels',
        'estimated_hours',
        'reviewer_employee_id',
        'assignment_status',
        'decline_reason',
        'checklist',
        'pr_tag',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'labels' => 'array',
            'estimated_hours' => 'decimal:2',
            'checklist' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_to_employee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by_employee_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'reviewer_employee_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }
}
