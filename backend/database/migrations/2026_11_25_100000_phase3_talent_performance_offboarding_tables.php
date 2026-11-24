<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add weighting/versioning to performance reviews & onboarding and create persistent offboarding_requests table.
     */
    public function up(): void
    {
        if (Schema::hasTable('review_ratings') && ! Schema::hasColumn('review_ratings', 'weight')) {
            Schema::table('review_ratings', function (Blueprint $table): void {
                $table->decimal('weight', 6, 2)->default(100.00)->after('kpi_title');
            });
        }

        if (Schema::hasTable('performance_reviews') && ! Schema::hasColumn('performance_reviews', 'version')) {
            Schema::table('performance_reviews', function (Blueprint $table): void {
                $table->unsignedInteger('version')->default(1)->after('completed_at');
            });
        }

        if (Schema::hasTable('kpis') && ! Schema::hasColumn('kpis', 'version')) {
            Schema::table('kpis', function (Blueprint $table): void {
                $table->unsignedInteger('version')->default(1)->after('is_active');
            });
        }

        if (Schema::hasTable('onboarding_journeys') && ! Schema::hasColumn('onboarding_journeys', 'version')) {
            Schema::table('onboarding_journeys', function (Blueprint $table): void {
                $table->unsignedInteger('version')->default(1)->after('journey_data');
            });
        }

        if (Schema::hasTable('onboarding_checklist_templates') && ! Schema::hasColumn('onboarding_checklist_templates', 'version')) {
            Schema::table('onboarding_checklist_templates', function (Blueprint $table): void {
                $table->unsignedInteger('version')->default(1)->after('task_data');
            });
        }

        if (! Schema::hasTable('offboarding_requests')) {
            Schema::create('offboarding_requests', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('manager_id')->nullable()->index();
                $table->string('manager_name', 180)->nullable();
                $table->date('resignation_date');
                $table->date('proposed_last_day');
                $table->unsignedInteger('notice_period_days')->default(0);
                $table->boolean('notice_compliant')->default(false);
                $table->text('reason');
                $table->boolean('manager_endorsed')->default(false);
                $table->foreignId('manager_endorsed_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('manager_endorsed_at')->nullable();
                $table->text('manager_comments')->nullable();
                $table->boolean('hr_verified')->default(false);
                $table->foreignId('hr_verified_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('hr_verified_at')->nullable();
                $table->text('contract_notes')->nullable();
                $table->string('status', 40)->default('SUBMITTED')->index();
                $table->json('exit_interview')->nullable();
                $table->json('clearances');
                $table->json('clearance_notes')->nullable();
                $table->timestamp('final_settled_at')->nullable();
                $table->foreignId('final_settled_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('settlement_notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->unsignedInteger('version')->default(1);
                $table->timestamps();

                $table->index(['employee_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('offboarding_requests');

        foreach (['onboarding_checklist_templates', 'onboarding_journeys', 'kpis', 'performance_reviews'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'version')) {
                Schema::table($table, function (Blueprint $blueprint): void {
                    $blueprint->dropColumn('version');
                });
            }
        }

        if (Schema::hasTable('review_ratings') && Schema::hasColumn('review_ratings', 'weight')) {
            Schema::table('review_ratings', function (Blueprint $table): void {
                $table->dropColumn('weight');
            });
        }
    }
};
