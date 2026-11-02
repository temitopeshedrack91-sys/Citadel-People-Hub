<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollImportRow extends Model
{
    protected $fillable = [
        'batch_id',
        'row_number',
        'raw_data',
        'mapped_data',
        'employee_id',
        'match_method',
        'match_confidence',
        'status',
        'errors',
        'warnings',
        'calculated_fields',
    ];

    protected function casts(): array
    {
        return [
            'raw_data' => 'array',
            'mapped_data' => 'array',
            'errors' => 'array',
            'warnings' => 'array',
            'calculated_fields' => 'array',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PayrollImportBatch::class, 'batch_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
