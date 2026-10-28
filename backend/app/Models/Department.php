<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Department extends Model
{
    use HasUuids;

    protected $fillable = ['entity_id', 'name', 'code', 'head_of_department_name', 'description', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }
}
