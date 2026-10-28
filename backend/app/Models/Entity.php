<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Entity extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'name', 'short_code', 'description', 'head_of_entity', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    protected static function booted(): void
    {
        static::creating(function (self $entity) {
            if (! $entity->id) {
                $entity->id = strtoupper($entity->short_code ?: (string) \Illuminate\Support\Str::uuid());
            }
        });
    }
}
