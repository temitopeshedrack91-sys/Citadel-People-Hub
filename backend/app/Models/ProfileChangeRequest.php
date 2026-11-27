<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileChangeRequest extends Model
{
    protected $fillable = [
        'employee_id',
        'employee_staff_id',
        'employee_name',
        'requested_by_name',
        'requested_by_role',
        'changes',
        'reason',
        'status',
        'reviewed_by_name',
        'reviewed_at',
        'review_comments',
    ];

    protected $casts = [
        'changes' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
