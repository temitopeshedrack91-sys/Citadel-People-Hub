<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdentityLink extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_VERIFIED = 'verified';

    public const STATUS_REVOKED = 'revoked';

    protected $fillable = [
        'user_id',
        'employee_id',
        'provider',
        'provider_user_id',
        'status',
        'verification_method',
        'verification_evidence',
        'verified_by_user_id',
        'verified_at',
        'last_verified_at',
        'revoked_by_user_id',
        'revoked_at',
        'revocation_reason',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'last_verified_at' => 'datetime',
            'revoked_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_user_id');
    }

    public function isVerified(): bool
    {
        return $this->status === self::STATUS_VERIFIED
            && $this->revoked_at === null
            && $this->employee_id !== null;
    }
}
