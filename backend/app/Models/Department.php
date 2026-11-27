<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $fillable = [
        'entity_id',
        'name',
        'code',
        'head_of_department_name',
        'business_head_name',
        'head_email',
        'reports_to',
        'is_gec_shared_service',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_gec_shared_service' => 'boolean',
        ];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'department_id');
    }

    /**
     * Normalize department ID between string slug/code (e.g. 'dept-cgcc-fin', 'CGCC-FIN') and numeric DB ID.
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
        $slugToCode = [
            'dept-cgcc-fin' => 'CGCC-FIN',
            'dept-cgcc-pccm' => 'CGCC-PCCM',
            'dept-cgcc-fac' => 'CGCC-FAC',
            'dept-cgcc-sec' => 'CGCC-SEC',
            'dept-cgcc-so' => 'CGCC-SO',
            'dept-cgcc-pro' => 'CGCC-PRO',
            'dept-cgcc-proto' => 'CGCC-PRO',
            'dept-cgcc-ict' => 'CGCC-ICT',
            'dept-cgcc-log' => 'CGCC-LOG',
            'dept-cgcc-trans' => 'CGCC-LOG',
            'dept-csog-acad' => 'CSOG-ACAD',
            'dept-csog-ops' => 'CSOG-OPS',
            'dept-ch-book' => 'CH-BOOK',
            'dept-ch-cafe' => 'CH-CAFE',
            'dept-ch-work' => 'CH-WORK',
            'dept-ch-asabi' => 'CH-ASABI',
            'dept-ch-sbd' => 'CH-SBD',
            'dept-ch-sales' => 'CH-SBD',
        ];

        $code = $slugToCode[$slug] ?? strtoupper(str_replace('dept-', '', $slug));
        $found = self::query()
            ->where('code', $code)
            ->orWhereRaw('LOWER(name) = ?', [$slug])
            ->first();

        return $found ? (int) $found->id : $departmentId;
    }
}
