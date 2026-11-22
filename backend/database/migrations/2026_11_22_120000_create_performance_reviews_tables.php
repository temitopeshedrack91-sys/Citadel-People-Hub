<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Performance Reviews, Key Performance Indicators (KPIs), and Review Ratings.
     * Replicates the appraisal workflow and rating rules of OrangeHRM Performance Plugin.
     */
    public function up(): void
    {
        if (! Schema::hasTable('kpis')) {
            Schema::create('kpis', function (Blueprint $table) {
                $table->id();
                $table->foreignId('job_title_id')->nullable()->constrained('job_titles')->nullOnDelete();
                $table->string('indicator');
                $table->decimal('min_rating', 3, 1)->default(1.0);
                $table->decimal('max_rating', 3, 1)->default(5.0);
                $table->decimal('weight', 5, 2)->default(100.00);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('performance_reviews')) {
            Schema::create('performance_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->foreignId('reviewer_id')->nullable()->constrained('employees')->nullOnDelete();
                $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
                $table->date('review_period_start');
                $table->date('review_period_end');
                $table->date('due_date');
                $table->string('status', 30)->default('DRAFT'); // DRAFT, IN_PROGRESS, SUBMITTED, EVALUATED, APPROVED
                $table->decimal('final_rating', 4, 2)->nullable();
                $table->text('employee_comments')->nullable();
                $table->text('reviewer_comments')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'status']);
                $table->index(['reviewer_id', 'status']);
            });
        }

        if (! Schema::hasTable('review_ratings')) {
            Schema::create('review_ratings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('performance_review_id')->constrained('performance_reviews')->cascadeOnDelete();
                $table->foreignId('kpi_id')->nullable()->constrained('kpis')->nullOnDelete();
                $table->string('kpi_title');
                $table->decimal('rating', 4, 2);
                $table->text('comment')->nullable();
                $table->timestamps();

                $table->index(['performance_review_id', 'kpi_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('review_ratings');
        Schema::dropIfExists('performance_reviews');
        Schema::dropIfExists('kpis');
    }
};
