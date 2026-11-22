<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CandidateInterview extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_id',
        'interview_title',
        'interviewer_id',
        'scheduled_date',
        'scheduled_time',
        'notes',
        'result',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    public function interviewer(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'interviewer_id');
    }
}
