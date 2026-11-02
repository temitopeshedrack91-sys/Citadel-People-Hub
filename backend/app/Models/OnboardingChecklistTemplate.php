<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingChecklistTemplate extends Model
{
    use HasUuids;

    protected $fillable = [
        'title', 'category', 'target_audience', 'duration', 'description', 'task_data', 'created_by_user_id',
    ];

    protected function casts(): array
    {
        return ['task_data' => 'array'];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
