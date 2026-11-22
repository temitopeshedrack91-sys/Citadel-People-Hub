<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Timesheets, Timesheet Items, and Action Logs.
     * Replicates the enterprise time tracking behavior of OrangeHRM Time Plugin.
     */
    public function up(): void
    {
        if (! Schema::hasTable('timesheets')) {
            Schema::create('timesheets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->date('period_start');
                $table->date('period_end');
                $table->string('status', 30)->default('DRAFT'); // DRAFT, SUBMITTED, APPROVED, REJECTED
                $table->decimal('total_hours', 8, 2)->default(0);
                $table->timestamp('submitted_at')->nullable();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->text('comments')->nullable();
                $table->timestamps();

                $table->unique(['employee_id', 'period_start']);
                $table->index(['employee_id', 'status']);
                $table->index(['period_start', 'period_end']);
            });
        }

        if (! Schema::hasTable('timesheet_items')) {
            Schema::create('timesheet_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('timesheet_id')->constrained('timesheets')->cascadeOnDelete();
                $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
                $table->string('activity_name');
                $table->date('date');
                $table->decimal('duration_hours', 5, 2)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['timesheet_id', 'date']);
            });
        }

        if (! Schema::hasTable('timesheet_action_logs')) {
            Schema::create('timesheet_action_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('timesheet_id')->constrained('timesheets')->cascadeOnDelete();
                $table->string('action', 30); // CREATE, SUBMIT, APPROVE, REJECT, RESET, MODIFY
                $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('comments')->nullable();
                $table->timestamps();

                $table->index(['timesheet_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('timesheet_action_logs');
        Schema::dropIfExists('timesheet_items');
        Schema::dropIfExists('timesheets');
    }
};
