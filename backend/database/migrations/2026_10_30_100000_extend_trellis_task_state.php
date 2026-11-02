<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        Schema::table('tasks', function (Blueprint $table): void {
            if (! Schema::hasColumn('tasks', 'labels')) {
                $table->json('labels')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'estimated_hours')) {
                $table->decimal('estimated_hours', 6, 2)->nullable();
            }
            if (! Schema::hasColumn('tasks', 'reviewer_employee_id')) {
                $table->foreignId('reviewer_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            }
            if (! Schema::hasColumn('tasks', 'assignment_status')) {
                $table->string('assignment_status', 20)->default('accepted');
            }
            if (! Schema::hasColumn('tasks', 'decline_reason')) {
                $table->text('decline_reason')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'checklist')) {
                $table->json('checklist')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'pr_tag')) {
                $table->string('pr_tag', 120)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        Schema::table('tasks', function (Blueprint $table): void {
            if (Schema::hasColumn('tasks', 'reviewer_employee_id')) {
                $table->dropConstrainedForeignId('reviewer_employee_id');
            }
            $columns = array_values(array_filter(
                ['labels', 'estimated_hours', 'assignment_status', 'decline_reason', 'checklist', 'pr_tag'],
                fn (string $column): bool => Schema::hasColumn('tasks', $column),
            ));
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
