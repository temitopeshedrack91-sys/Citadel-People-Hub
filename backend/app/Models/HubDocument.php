<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HubDocument extends Model
{
    use HasUuids;

    protected $fillable = [
        'title', 'description', 'file_name', 'file_size', 'file_type', 'category',
        'access_level', 'entity_scope', 'department_scope', 'uploaded_by', 'version',
        'storage_path', 'is_sensitive',
    ];

    protected function casts(): array
    {
        return ['is_sensitive' => 'boolean'];
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
