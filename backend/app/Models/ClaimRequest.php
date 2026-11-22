<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClaimRequest extends Model
{
    use HasFactory;

    public const STATUS_INITIATED = 'INITIATED';
    public const STATUS_SUBMITTED = 'SUBMITTED';
    public const STATUS_APPROVED  = 'APPROVED';
    public const STATUS_REJECTED  = 'REJECTED';
    public const STATUS_CANCELLED = 'CANCELLED';
    public const STATUS_PAID      = 'PAID';

    protected $fillable = [
        'claim_number',
        'employee_id',
        'claim_event_id',
        'currency',
        'description',
        'remarks',
        'status',
        'total_amount',
        'submitted_at',
        'approved_by',
        'approved_at',
        'paid_by',
        'paid_at',
        'rejection_reason',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function claimEvent(): BelongsTo
    {
        return $this->belongsTo(ClaimEvent::class, 'claim_event_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(ClaimExpense::class, 'claim_request_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function recalculateTotal(): void
    {
        $this->total_amount = $this->expenses()->sum('amount') ?? 0;
        $this->save();
    }
}
