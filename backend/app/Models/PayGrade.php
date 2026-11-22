<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayGrade extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'currency',
        'min_salary',
        'max_salary',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'min_salary' => 'decimal:2',
        'max_salary' => 'decimal:2',
    ];
}
