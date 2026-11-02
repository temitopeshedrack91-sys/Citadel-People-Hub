<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollImportBatch extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'template_id',
        'original_filename',
        'uploaded_by',
        'status',
        'total_rows',
        'valid_rows',
        'error_rows',
        'warning_rows',
        'validation_errors',
        'validation_warnings',
        'import_options',
        'payroll_run_id',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'validation_errors' => 'array',
            'validation_warnings' => 'array',
            'import_options' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PayrollExcelTemplate::class, 'template_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(PayrollImportRow::class, 'batch_id');
    }
}
