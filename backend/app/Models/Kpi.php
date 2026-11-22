<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kpi extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_title_id',
        'indicator',
        'min_rating',
        'max_rating',
        'weight',
        'is_active',
    ];

    protected $casts = [
        'min_rating' => 'decimal:1',
        'max_rating' => 'decimal:1',
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function jobTitle(): BelongsTo
    {
        return $this->belongsTo(JobTitle::class);
    }
}
