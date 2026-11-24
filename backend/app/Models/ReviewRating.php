<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'performance_review_id',
        'kpi_id',
        'kpi_title',
        'weight',
        'rating',
        'comment',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'rating' => 'decimal:2',
    ];

    public function review(): BelongsTo
    {
        return $this->belongsTo(PerformanceReview::class, 'performance_review_id');
    }

    public function kpi(): BelongsTo
    {
        return $this->belongsTo(Kpi::class);
    }
}
