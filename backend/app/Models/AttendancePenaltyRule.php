<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendancePenaltyRule extends Model
{
    protected $fillable = [
        'name',
        'description',
        'entity_id',
        'penalty_type',
        'calculation_method',
        'amount_per_incident',
        'percentage_of_daily_rate',
        'tiered_rules',
        'grace_period_minutes',
        'max_incidents_per_period',
        'apply_to_gross',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount_per_incident' => 'decimal:2',
            'percentage_of_daily_rate' => 'decimal:2',
            'tiered_rules' => 'array',
            'apply_to_gross' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(CitadelEntity::class, 'entity_id', 'id');
    }
}
