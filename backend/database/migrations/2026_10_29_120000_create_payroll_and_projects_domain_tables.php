<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Payroll, Projects & Tasks, and Extended Leave.
     */
    public function up(): void
    {
        // 1. Payroll Management Tables
        if (! Schema::hasTable('salary_templates')) {
            Schema::create('salary_templates', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code', 30)->unique();
                $table->string('pay_frequency', 20)->default('monthly');
                $table->decimal('basic_salary', 14, 2);
                $table->decimal('house_rent', 14, 2)->default(0);
                $table->decimal('medical_allowance', 14, 2)->default(0);
                $table->decimal('conveyance_allowance', 14, 2)->default(0);
                $table->decimal('other_allowance', 14, 2)->default(0);
                $table->decimal('provident_fund_percent', 5, 2)->default(0);
                $table->decimal('tax_percent', 5, 2)->default(0);
                $table->text('notes')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('employee_salary_templates')) {
            Schema::create('employee_salary_templates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->foreignId('salary_template_id')->constrained('salary_templates')->restrictOnDelete();
                $table->string('pay_frequency', 20)->nullable();
                $table->decimal('basic_salary', 14, 2)->default(0);
                $table->decimal('house_rent', 14, 2)->default(0);
                $table->decimal('medical_allowance', 14, 2)->default(0);
                $table->decimal('conveyance_allowance', 14, 2)->default(0);
                $table->decimal('other_allowance', 14, 2)->default(0);
                $table->decimal('gross_salary', 14, 2)->default(0);
                $table->decimal('provident_fund_percent', 5, 2)->default(0);
                $table->decimal('tax_percent', 5, 2)->default(0);
                $table->decimal('ctc_amount', 14, 2)->nullable();
                $table->text('notes')->nullable();
                $table->date('effective_from');
                $table->date('effective_to')->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'effective_from']);
                $table->index(['salary_template_id', 'effective_from'], 'emp_sal_tpl_eff_idx');
            });
        }

        if (! Schema::hasTable('bonuses')) {
            Schema::create('bonuses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('title');
                $table->decimal('amount', 14, 2);
                $table->date('bonus_date');
                $table->string('bonus_type', 40)->default('performance');
                $table->text('remarks')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['employee_id', 'bonus_date']);
            });
        }

        if (! Schema::hasTable('employee_loans')) {
            Schema::create('employee_loans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('loan_reference')->unique();
                $table->decimal('principal_amount', 14, 2);
                $table->decimal('interest_rate_percent', 5, 2)->default(0);
                $table->unsignedSmallInteger('installment_count');
                $table->decimal('installment_amount', 14, 2);
                $table->date('issued_date');
                $table->date('first_installment_date')->nullable();
                $table->string('status', 30)->default('active');
                $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('supervisor_approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('supervisor_approved_at')->nullable();
                $table->foreignId('final_approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('final_approved_at')->nullable();
                $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('rejected_at')->nullable();
                $table->text('remarks')->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'status']);
            });
        }

        if (! Schema::hasTable('loan_installments')) {
            Schema::create('loan_installments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_loan_id')->constrained('employee_loans')->cascadeOnDelete();
                $table->unsignedSmallInteger('installment_no');
                $table->date('due_date');
                $table->decimal('amount', 14, 2);
                $table->decimal('paid_amount', 14, 2)->default(0);
                $table->date('paid_date')->nullable();
                $table->unsignedBigInteger('payroll_item_id')->nullable();
                $table->string('status', 20)->default('pending');
                $table->timestamps();

                $table->unique(['employee_loan_id', 'installment_no']);
                $table->index(['due_date', 'status']);
            });
        }

        if (! Schema::hasTable('employee_deductions')) {
            Schema::create('employee_deductions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('deduction_type', 50);
                $table->string('calculation_type', 20)->default('fixed');
                $table->decimal('amount', 14, 2);
                $table->date('effective_from');
                $table->date('effective_to')->nullable();
                $table->string('frequency', 20)->default('monthly');
                $table->string('reason', 255)->nullable();
                $table->text('comments')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['employee_id', 'is_active']);
                $table->index(['deduction_type', 'is_active']);
            });
        }

        if (! Schema::hasTable('employee_provident_funds')) {
            Schema::create('employee_provident_funds', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->decimal('employee_contribution_percent', 5, 2)->default(0);
                $table->decimal('employer_contribution_percent', 5, 2)->default(0);
                $table->decimal('opening_balance', 14, 2)->default(0);
                $table->date('effective_from')->nullable();
                $table->timestamps();

                $table->unique('employee_id');
            });
        }

        if (! Schema::hasTable('payroll_runs')) {
            Schema::create('payroll_runs', function (Blueprint $table) {
                $table->id();
                $table->string('pay_frequency', 20)->default('monthly');
                $table->unsignedSmallInteger('payroll_year')->nullable();
                $table->unsignedTinyInteger('payroll_month')->nullable();
                $table->unsignedTinyInteger('payroll_week')->nullable();
                $table->string('period_label', 100)->nullable();
                $table->date('period_start');
                $table->date('period_end');
                $table->date('pay_date')->nullable();
                $table->string('status', 20)->default('draft');
                $table->decimal('gross_total', 16, 2)->default(0);
                $table->decimal('deduction_total', 16, 2)->default(0);
                $table->decimal('net_total', 16, 2)->default(0);
                $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();

                $table->unique(['pay_frequency', 'period_start', 'period_end'], 'payroll_run_period_unique');
                $table->index(['status', 'pay_frequency', 'period_start']);
                $table->index(['payroll_year', 'payroll_month', 'payroll_week']);
            });
        }

        if (! Schema::hasTable('payroll_items')) {
            Schema::create('payroll_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('pay_frequency', 20)->default('monthly');
                $table->decimal('basic_salary', 14, 2)->default(0);
                $table->decimal('allowance_total', 14, 2)->default(0);
                $table->decimal('bonus_total', 14, 2)->default(0);
                $table->decimal('loan_deduction', 14, 2)->default(0);
                $table->decimal('other_deduction', 14, 2)->default(0);
                $table->decimal('provident_fund_deduction', 14, 2)->default(0);
                $table->decimal('employer_pf_contribution', 14, 2)->default(0);
                $table->decimal('tax_deduction', 14, 2)->default(0);
                $table->decimal('total_deduction', 14, 2)->default(0);
                $table->decimal('net_payable', 14, 2)->default(0);
                $table->string('payment_status', 20)->default('pending');
                $table->string('payment_reference')->nullable();
                $table->timestamps();

                $table->unique(['payroll_run_id', 'employee_id']);
                $table->index(['employee_id', 'payment_status']);
            });
        }

        if (! Schema::hasTable('payroll_item_deductions')) {
            Schema::create('payroll_item_deductions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payroll_item_id')->constrained('payroll_items')->cascadeOnDelete();
                $table->foreignId('employee_deduction_id')->nullable()->constrained('employee_deductions')->nullOnDelete();
                $table->string('deduction_type', 50);
                $table->decimal('amount', 14, 2);
                $table->string('reason', 255)->nullable();
                $table->text('comments')->nullable();
                $table->timestamps();

                $table->index(['payroll_item_id', 'deduction_type']);
            });
        }

        if (! Schema::hasTable('provident_fund_transactions')) {
            Schema::create('provident_fund_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->foreignId('payroll_run_id')->nullable()->constrained('payroll_runs')->cascadeOnDelete();
                $table->string('reference_no')->unique();
                $table->date('transaction_date');
                $table->string('transaction_type', 30)->default('contribution');
                $table->decimal('employee_contribution', 14, 2)->default(0);
                $table->decimal('employer_contribution', 14, 2)->default(0);
                $table->decimal('adjustment_amount', 14, 2)->default(0);
                $table->decimal('withdrawal_amount', 14, 2)->default(0);
                $table->decimal('balance_after', 14, 2)->default(0);
                $table->string('reason')->nullable();
                $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['employee_id', 'transaction_date']);
            });
        }

        // 2. Projects & Tasks Tables (Trellis backend)
        if (! Schema::hasTable('projects')) {
            Schema::create('projects', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('code', 50)->unique();
                $table->text('description')->nullable();
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
                $table->string('status', 30)->default('active');
                $table->string('priority', 20)->default('medium');
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->decimal('budget', 14, 2)->default(0);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['status', 'department_id']);
            });
        }

        if (! Schema::hasTable('project_members')) {
            Schema::create('project_members', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('role', 30)->default('member');
                $table->timestamps();

                $table->unique(['project_id', 'employee_id']);
            });
        }

        if (! Schema::hasTable('tasks')) {
            Schema::create('tasks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('priority', 20)->default('medium');
                $table->string('status', 30)->default('todo');
                $table->date('due_date')->nullable();
                $table->foreignId('assigned_to_employee_id')->nullable()->constrained('employees')->nullOnDelete();
                $table->foreignId('created_by_employee_id')->nullable()->constrained('employees')->nullOnDelete();
                $table->timestamps();

                $table->index(['status', 'project_id']);
                $table->index(['assigned_to_employee_id', 'status']);
            });
        }

        if (! Schema::hasTable('task_comments')) {
            Schema::create('task_comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
                $table->text('comment');
                $table->timestamps();
            });
        }

        // 3. Leave Policy & Balance Tables (Extended leave features)
        if (! Schema::hasTable('leave_categories')) {
            Schema::create('leave_categories', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code', 30)->unique();
                $table->boolean('is_paid')->default(true);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('leave_policies')) {
            Schema::create('leave_policies', function (Blueprint $table) {
                $table->id();
                $table->foreignId('leave_category_id')->constrained('leave_categories')->cascadeOnDelete();
                $table->string('name');
                $table->unsignedSmallInteger('days_allowed')->default(20);
                $table->unsignedSmallInteger('carry_forward_days')->default(0);
                $table->unsignedSmallInteger('effective_year')->default(2026);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('employee_leave_balances')) {
            Schema::create('employee_leave_balances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->foreignId('leave_category_id')->constrained('leave_categories')->cascadeOnDelete();
                $table->unsignedSmallInteger('year')->default(2026);
                $table->decimal('total_days', 6, 2)->default(0);
                $table->decimal('used_days', 6, 2)->default(0);
                $table->decimal('pending_days', 6, 2)->default(0);
                $table->decimal('remaining_days', 6, 2)->default(0);
                $table->timestamps();

                $table->unique(['employee_id', 'leave_category_id', 'year']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_leave_balances');
        Schema::dropIfExists('leave_policies');
        Schema::dropIfExists('leave_categories');
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('provident_fund_transactions');
        Schema::dropIfExists('payroll_item_deductions');
        Schema::dropIfExists('payroll_items');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('employee_provident_funds');
        Schema::dropIfExists('employee_deductions');
        Schema::dropIfExists('loan_installments');
        Schema::dropIfExists('employee_loans');
        Schema::dropIfExists('bonuses');
        Schema::dropIfExists('employee_salary_templates');
        Schema::dropIfExists('salary_templates');
    }
};
