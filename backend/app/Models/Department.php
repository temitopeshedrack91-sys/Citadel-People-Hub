<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Department extends Model
{
    protected $fillable = ['entity_id', 'name', 'code', 'head_of_department_name', 'description', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    /**
     * Normalize department ID between string slug (e.g. 'dept-cgcc-fin') and numeric ID.
     */
    public static function normalizeDepartmentId(mixed $departmentId): mixed
    {
        if (empty($departmentId) || $departmentId === 'all') {
            return null;
        }
        if (is_numeric($departmentId)) {
            return (int) $departmentId;
        }
        $slug = strtolower(trim((string) $departmentId));
        $map = [
            'dept-cgcc-fin' => 1,
            'dept-cgcc-pccm' => 2,
            'dept-cgcc-fac' => 3,
            'dept-cgcc-sec' => 4,
            'dept-cgcc-so' => 5,
            'dept-cgcc-pro' => 6,
            'dept-cgcc-ict' => 7,
            'dept-cgcc-log' => 8,
            'dept-csog-acad' => 9,
            'dept-csog-ops' => 10,
            'dept-ch-book' => 11,
            'dept-ch-cafe' => 12,
            'dept-ch-work' => 13,
            'dept-ch-asabi' => 14,
            'dept-ch-sbd' => 15,
        ];
        if (isset($map[$slug])) {
            return $map[$slug];
        }
        $code = strtoupper(str_replace('dept-', '', $slug));
        $found = self::where('code', $code)->orWhere('code', 'like', "%{$code}%")->first();
        return $found ? $found->id : $departmentId;
    }
}
