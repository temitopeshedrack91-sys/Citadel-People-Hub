<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Employee extends Model
{
    protected $fillable = [
        'staff_id', 'biometric_device_id', 'full_name', 'first_name', 'last_name', 'profile_photo', 'date_of_birth',
        'gender', 'phone', 'email', 'address', 'emergency_contact', 'next_of_kin', 'entity_id',
        'department_id', 'job_title', 'grade_level', 'employment_type', 'employment_date',
        'confirmation_date', 'manager_id', 'manager_name', 'contract_status', 'years_of_service',
        'qualifications', 'certifications', 'bank_payroll', 'pension_hmo', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date:Y-m-d',
            'address' => 'string',
            'emergency_contact' => 'array',
            'next_of_kin' => 'array',
            'bank_payroll' => 'array',
            'pension_hmo' => 'array',
            'qualifications' => 'array',
            'certifications' => 'array',
            'employment_date' => 'date:Y-m-d',
            'confirmation_date' => 'date:Y-m-d',
        ];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function salaryAssignments(): HasMany
    {
        return $this->hasMany(EmployeeSalaryTemplate::class);
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(EmployeeLoan::class);
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(EmployeeDeduction::class);
    }

    public function providentFund(): HasOne
    {
        return $this->hasOne(EmployeeProvidentFund::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assigned_to_employee_id');
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_members')->withPivot('role')->withTimestamps();
    }
}
