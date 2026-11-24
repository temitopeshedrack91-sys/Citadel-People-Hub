<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RealtimeEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'table_name',
        'event_type',
        'record_id',
        'actor_user_id',
        'payload',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
