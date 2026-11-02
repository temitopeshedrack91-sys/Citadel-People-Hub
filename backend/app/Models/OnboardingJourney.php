<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingJourney extends Model
{
    use HasUuids;

    protected $fillable = ['employee_id', 'employee_record_id', 'journey_data'];

    protected function casts(): array
    {
        return ['journey_data' => 'array'];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function employeeRecord(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_record_id');
    }
}
