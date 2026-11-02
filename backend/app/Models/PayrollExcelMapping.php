<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollExcelMapping extends Model
{
    protected $fillable = [
        'template_id',
        'excel_column',
        'payroll_field',
        'field_type',
        'calculation_type',
        'default_value',
        'is_required',
        'is_identifier',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'default_value' => 'decimal:2',
            'is_required' => 'boolean',
            'is_identifier' => 'boolean',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PayrollExcelTemplate::class, 'template_id');
    }
}
