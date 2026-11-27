<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

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

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'entity_id', 'id');
    }

    /**
     * Normalize entity ID between string slug (e.g. 'entity-cgcc') and database ID ('CGCC').
     */
    public static function normalizeEntityId(?string $entityId): ?string
    {
        if (empty($entityId) || $entityId === 'all') {
            return null;
        }
        $trimmed = trim($entityId);
        $upper = strtoupper($trimmed);
        if ($upper === 'CGCC' || $upper === 'ENTITY-CGCC') return 'CGCC';
        if ($upper === 'CSOG' || $upper === 'ENTITY-CSOG') return 'CSOG';
        if ($upper === 'HOLDINGS' || $upper === 'ENTITY-HOLDINGS' || $upper === 'CH') return 'HOLDINGS';
        return $trimmed;
    }

    protected static function booted(): void
    {
        static::creating(function (self $entity) {
            if (! $entity->id) {
                $entity->id = strtoupper($entity->short_code ?: (string) Str::uuid());
            }
        });
    }
}
