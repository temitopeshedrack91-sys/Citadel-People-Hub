<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollExcelTemplate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'original_filename',
        'created_by',
        'columns',
        'mappings',
        'sample_data',
        'is_active',
        'is_default',
        'entity_id',
    ];

    protected function casts(): array
    {
        return [
            'columns' => 'array',
            'mappings' => 'array',
            'sample_data' => 'array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(CitadelEntity::class, 'entity_id', 'id');
    }

    public function mappings(): HasMany
    {
        return $this->hasMany(PayrollExcelMapping::class, 'template_id');
    }

    public function importBatches(): HasMany
    {
        return $this->hasMany(PayrollImportBatch::class, 'template_id');
    }
}
