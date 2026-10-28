<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'user_name', 'user_role', 'module', 'action', 'record_affected_id',
        'record_affected_title', 'previous_value', 'new_value', 'ip_address', 'user_agent', 'severity',
    ];

    protected $guarded = ['id'];
}
