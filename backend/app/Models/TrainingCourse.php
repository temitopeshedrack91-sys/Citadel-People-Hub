<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingCourse extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'code',
        'description',
        'trainer_provider',
        'duration_hours',
        'is_active',
    ];

    protected $casts = [
        'duration_hours' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function sessions(): HasMany
    {
        return $this->hasMany(TrainingSession::class, 'course_id');
    }
}
