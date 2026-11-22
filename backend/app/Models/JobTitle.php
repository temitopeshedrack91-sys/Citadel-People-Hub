<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobTitle extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'specification',
        'min_experience_years',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'min_experience_years' => 'integer',
    ];

    public function kpis(): HasMany
    {
        return $this->hasMany(Kpi::class);
    }

    public function vacancies(): HasMany
    {
        return $this->hasMany(JobVacancy::class);
    }
}
