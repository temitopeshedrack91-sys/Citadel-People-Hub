<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SystemNotification extends Model
{
    use HasUuids;

    protected $fillable = [
        'type', 'category', 'title', 'message', 'target_user_id', 'target_user_role',
        'action_url', 'read_at',
    ];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}
