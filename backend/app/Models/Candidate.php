<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Candidate extends Model
{
    use HasFactory;

    protected $fillable = [
        'vacancy_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'resume_url',
        'status',
        'notes',
        'applied_date',
    ];

    protected $casts = [
        'applied_date' => 'date',
    ];

    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'vacancy_id');
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(CandidateInterview::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(CandidateHistory::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
