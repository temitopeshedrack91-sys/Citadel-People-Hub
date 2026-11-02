<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HubDocument extends Model
{
    protected $table = 'documents';

    protected $fillable = [
        'employee_id',
        'title',
        'description',
        'file_name',
        'file_size',
        'file_type',
        'category',
        'access_level',
        'entity_scope',
        'department_scope',
        'uploaded_by',
        'version',
        'version_number',
        'previous_version_id',
        'issue_date',
        'expiry_date',
        'storage_path',
        'is_sensitive',
    ];

    protected function casts(): array
    {
        return [
            'is_sensitive' => 'boolean',
            'issue_date' => 'date',
            'expiry_date' => 'date',
            'version_number' => 'integer',
        ];
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function previousVersion(): BelongsTo
    {
        return $this->belongsTo(self::class, 'previous_version_id');
    }

    public function nextVersion(): BelongsTo
    {
        return $this->belongsTo(self::class, 'id', 'previous_version_id');
    }
}
