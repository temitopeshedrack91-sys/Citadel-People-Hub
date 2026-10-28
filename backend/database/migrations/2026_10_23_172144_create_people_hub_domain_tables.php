<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $existingDomainTables = array_filter([
            'entities',
            'departments',
            'employees',
            'leave_requests',
            'attendance_records',
            'audit_logs',
        ], fn (string $table) => Schema::hasTable($table));

        if ($existingDomainTables !== []) {
            throw new RuntimeException(
                'Existing People Hub tables were found: '.implode(', ', $existingDomainTables).
                '. Reconcile the live schema before running Laravel migrations; no domain tables were changed.'
            );
        }

        Schema::create('entities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('short_code')->unique();
            $table->text('description')->nullable();
            $table->string('head_of_entity')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('entity_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('code');
            $table->string('head_of_department_name')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['entity_id', 'code']);
            $table->index(['entity_id', 'is_active']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('EMPLOYEE')->index();
            $table->string('staff_id')->nullable()->unique();
            $table->foreignUuid('entity_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('job_title')->nullable();
            $table->boolean('is_active')->default(true);
        });

        Schema::create('employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('staff_id')->unique();
            $table->string('full_name');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('profile_photo')->nullable();
            $table->text('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable()->index();
            $table->text('address')->nullable();
            $table->text('emergency_contact')->nullable();
            $table->text('next_of_kin')->nullable();
            $table->foreignUuid('entity_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('department_id')->constrained()->restrictOnDelete();
            $table->string('job_title');
            $table->string('grade_level')->nullable();
            $table->string('employment_type')->nullable();
            $table->date('employment_date')->nullable();
            $table->date('confirmation_date')->nullable();
            $table->uuid('manager_id')->nullable();
            $table->string('manager_name')->nullable();
            $table->string('contract_status')->nullable();
            $table->unsignedSmallInteger('years_of_service')->default(0);
            $table->json('qualifications')->nullable();
            $table->json('certifications')->nullable();
            $table->text('bank_payroll')->nullable();
            $table->text('pension_hmo')->nullable();
            $table->string('status')->default('Active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['entity_id', 'department_id']);
        });

        Schema::create('leave_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('employee_id')->constrained()->cascadeOnDelete();
            $table->string('employee_staff_id');
            $table->string('employee_name');
            $table->string('entity_name');
            $table->string('department_name');
            $table->string('leave_type');
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedSmallInteger('total_days');
            $table->text('reason');
            $table->string('relieving_staff_id')->nullable();
            $table->string('relieving_staff_name')->nullable();
            $table->string('handover_colleague')->nullable();
            $table->string('status')->default('Pending')->index();
            $table->string('approval_stage')->default('DEPARTMENT_HEAD');
            $table->timestamp('applied_date');
            $table->text('approver_comments')->nullable();
            $table->json('approval_history')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'status']);
        });

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('employee_id')->constrained()->cascadeOnDelete();
            $table->string('employee_staff_id');
            $table->string('employee_name');
            $table->string('entity_name');
            $table->string('department_name');
            $table->date('date');
            $table->timestamp('clock_in_time')->nullable();
            $table->timestamp('clock_out_time')->nullable();
            $table->decimal('duration_hours', 6, 2)->nullable();
            $table->string('status')->default('Present');
            $table->string('verification_source')->default('Web_SelfService');
            $table->string('device_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'date']);
        });

        Schema::create('hub_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_name');
            $table->unsignedBigInteger('file_size');
            $table->string('file_type');
            $table->string('category');
            $table->string('access_level');
            $table->string('entity_scope')->nullable();
            $table->string('department_scope')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('version')->default('1.0');
            $table->string('storage_path');
            $table->boolean('is_sensitive')->default(false);
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name');
            $table->string('user_role');
            $table->string('module');
            $table->string('action');
            $table->string('record_affected_id')->nullable();
            $table->string('record_affected_title')->nullable();
            $table->text('previous_value')->nullable();
            $table->text('new_value')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('severity')->default('Info');
            $table->timestamps();
            $table->index(['module', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('system_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->string('category')->nullable();
            $table->string('title');
            $table->text('message');
            $table->foreignId('target_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('target_user_role')->nullable();
            $table->string('action_url')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('onboarding_journeys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->json('journey_data');
            $table->timestamps();
        });

        Schema::create('recruitment_requisitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('requisition_code')->unique();
            $table->string('job_title');
            $table->foreignUuid('entity_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained()->nullOnDelete();
            $table->json('requisition_data');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_requisitions');
        Schema::dropIfExists('onboarding_journeys');
        Schema::dropIfExists('system_notifications');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('hub_documents');
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('employees');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropConstrainedForeignId('entity_id');
            $table->dropColumn(['role', 'staff_id', 'job_title', 'is_active']);
        });

        Schema::dropIfExists('departments');
        Schema::dropIfExists('entities');
    }
};
