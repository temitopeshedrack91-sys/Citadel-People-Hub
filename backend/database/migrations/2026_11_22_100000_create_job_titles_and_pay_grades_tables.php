<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Job Titles, Pay Grades, and Employment Statuses.
     * Replicates the organizational classification capabilities of OrangeHRM Admin Plugin.
     */
    public function up(): void
    {
        if (! Schema::hasTable('job_titles')) {
            Schema::create('job_titles', function (Blueprint $table) {
                $table->id();
                $table->string('title')->unique();
                $table->text('description')->nullable();
                $table->text('specification')->nullable();
                $table->unsignedSmallInteger('min_experience_years')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('pay_grades')) {
            Schema::create('pay_grades', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('currency', 10)->default('NGN');
                $table->decimal('min_salary', 14, 2)->default(0);
                $table->decimal('max_salary', 14, 2)->default(0);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('employment_statuses')) {
            Schema::create('employment_statuses', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employment_statuses');
        Schema::dropIfExists('pay_grades');
        Schema::dropIfExists('job_titles');
    }
};
