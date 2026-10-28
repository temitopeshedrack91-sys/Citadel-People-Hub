<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecruitmentRequisition extends Model
{
    use HasUuids;

    protected $fillable = ['requisition_code', 'job_title', 'entity_id', 'department_id', 'requisition_data'];

    protected function casts(): array
    {
        return ['requisition_data' => 'array'];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
