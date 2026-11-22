<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobVacancy extends Model
{
    use HasFactory;

    protected $fillable = [
        'requisition_id',
        'title',
        'job_title_id',
        'department_id',
        'hiring_manager_id',
        'positions_count',
        'description',
        'status',
    ];

    protected $casts = [
        'positions_count' => 'integer',
    ];

    public function jobTitle(): BelongsTo
    {
        return $this->belongsTo(JobTitle::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function hiringManager(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'hiring_manager_id');
    }

    public function candidates(): HasMany
    {
        return $this->hasMany(Candidate::class, 'vacancy_id');
    }
}
