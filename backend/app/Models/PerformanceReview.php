<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerformanceReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'reviewer_id',
        'creator_id',
        'review_period_start',
        'review_period_end',
        'due_date',
        'status',
        'final_rating',
        'employee_comments',
        'reviewer_comments',
        'completed_at',
        'version',
    ];

    protected $casts = [
        'review_period_start' => 'date',
        'review_period_end' => 'date',
        'due_date' => 'date',
        'final_rating' => 'decimal:2',
        'completed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'reviewer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(ReviewRating::class);
    }
}
