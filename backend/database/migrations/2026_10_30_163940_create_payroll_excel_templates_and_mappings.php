<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Excel Payroll Templates - stores uploaded Excel structures for reuse
        Schema::create('payroll_excel_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('original_filename')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->json('columns')->default('[]'); // Original Excel column headers
            $table->json('mappings')->default('[]'); // Column to payroll field mappings
            $table->json('sample_data')->nullable(); // First few rows for preview
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->string('entity_id')->nullable();
            $table->foreign('entity_id')->references('id')->on('entities')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['entity_id', 'is_active']);
            $table->index(['created_by', 'is_active']);
        });

        // Excel Column Mappings - detailed field mappings for each template
        Schema::create('payroll_excel_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('payroll_excel_templates')->cascadeOnDelete();
            $table->string('excel_column'); // Original Excel column name
            $table->string('payroll_field'); // Target payroll field (basic_salary, house_rent, etc.)
            $table->string('field_type')->default('earning'); // earning, deduction, identifier, info
            $table->string('calculation_type')->nullable(); // fixed, percentage, formula
            $table->decimal('default_value', 14, 2)->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_identifier')->default(false); // For employee matching (staff_id, email, etc.)
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['template_id', 'payroll_field']);
        });

        // Payroll Import Batches - track each upload session
        Schema::create('payroll_import_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->nullable()->constrained('payroll_excel_templates')->nullOnDelete();
            $table->string('original_filename');
            $table->unsignedBigInteger('uploaded_by');
            $table->string('status')->default('pending'); // pending, preview, validating, processing, completed, failed
            $table->integer('total_rows')->default(0);
            $table->integer('valid_rows')->default(0);
            $table->integer('error_rows')->default(0);
            $table->integer('warning_rows')->default(0);
            $table->json('validation_errors')->nullable();
            $table->json('validation_warnings')->nullable();
            $table->json('import_options')->nullable(); // proration_method, attendance_integration, etc.
            $table->foreignId('payroll_run_id')->nullable()->constrained('payroll_runs')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['uploaded_by', 'status']);
            $table->index(['payroll_run_id']);
        });

        // Payroll Import Rows - individual employee records from Excel
        Schema::create('payroll_import_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('payroll_import_batches')->cascadeOnDelete();
            $table->integer('row_number');
            $table->json('raw_data'); // Original row data
            $table->json('mapped_data')->nullable(); // Mapped to payroll fields
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->string('match_method')->nullable(); // staff_id, email, name_fuzzy, manual
            $table->string('match_confidence')->nullable(); // high, medium, low, none
            $table->string('status')->default('pending'); // pending, matched, unmatched, error, warning
            $table->json('errors')->nullable();
            $table->json('warnings')->nullable();
            $table->json('calculated_fields')->nullable(); // Computed proration, penalties, etc.
            $table->timestamps();

            $table->index(['batch_id', 'status']);
            $table->index(['batch_id', 'employee_id']);
        });

        // Payroll Adjustments - manual edits to payroll items with audit trail
        Schema::create('payroll_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_item_id')->constrained('payroll_items')->cascadeOnDelete();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->unsignedBigInteger('employee_id');
            $table->string('field_name'); // basic_salary, house_rent, tax_deduction, etc.
            $table->string('field_category')->default('earning'); // earning, deduction, other
            $table->decimal('original_value', 14, 2);
            $table->decimal('adjusted_value', 14, 2);
            $table->decimal('difference', 14, 2);
            $table->text('reason');
            $table->unsignedBigInteger('adjusted_by');
            $table->timestamp('adjusted_at')->useCurrent();
            $table->boolean('is_system_generated')->default(false); // For proration, attendance penalties
            $table->timestamps();

            $table->index(['payroll_run_id', 'employee_id']);
            $table->index(['adjusted_by', 'adjusted_at']);
        });

        // Attendance Penalty Rules - configurable lateness/absenteeism policies
        Schema::create('attendance_penalty_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('entity_id')->nullable();
            $table->foreign('entity_id')->references('id')->on('entities')->nullOnDelete();
            $table->string('penalty_type')->default('lateness'); // lateness, unapproved_absence, unpaid_leave
            $table->string('calculation_method')->default('fixed_per_incident'); // fixed_per_incident, percentage_of_daily_rate, tiered
            $table->decimal('amount_per_incident', 14, 2)->default(0);
            $table->decimal('percentage_of_daily_rate', 5, 2)->default(0);
            $table->json('tiered_rules')->nullable(); // For tiered: [{threshold_minutes: 15, amount: 500}, ...]
            $table->integer('grace_period_minutes')->default(0);
            $table->integer('max_incidents_per_period')->nullable();
            $table->boolean('apply_to_gross')->default(false); // true = reduce gross, false = add to deductions
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['entity_id', 'penalty_type', 'is_active']);
        });

        // Employee Proration Records - track prorated calculations
        Schema::create('employee_proration_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_item_id')->constrained('payroll_items')->cascadeOnDelete();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->unsignedBigInteger('employee_id');
            $table->string('proration_reason')->default('mid_month_join'); // mid_month_join, mid_month_leave, unpaid_leave, mid_month_termination
            $table->date('period_start');
            $table->date('period_end');
            $table->date('effective_start')->nullable(); // Actual start/end date for proration
            $table->date('effective_end')->nullable();
            $table->integer('calendar_days_in_period');
            $table->integer('working_days_in_period');
            $table->integer('eligible_days');
            $table->string('calculation_method')->default('calendar_days'); // calendar_days, working_days
            $table->decimal('full_basic_salary', 14, 2);
            $table->decimal('prorated_basic_salary', 14, 2);
            $table->decimal('proration_factor', 8, 6);
            $table->json('affected_allowances')->nullable(); // Which allowances are prorated
            $table->json('affected_deductions')->nullable(); // Which deductions are prorated
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['payroll_run_id', 'employee_id']);
            $table->index(['proration_reason']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_proration_records');
        Schema::dropIfExists('attendance_penalty_rules');
        Schema::dropIfExists('payroll_adjustments');
        Schema::dropIfExists('payroll_import_rows');
        Schema::dropIfExists('payroll_import_batches');
        Schema::dropIfExists('payroll_excel_mappings');
        Schema::dropIfExists('payroll_excel_templates');
    }
};
