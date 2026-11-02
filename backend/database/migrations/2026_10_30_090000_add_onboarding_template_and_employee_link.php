<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('onboarding_journeys', 'employee_record_id')) {
            Schema::table('onboarding_journeys', function (Blueprint $table): void {
                $table->foreignId('employee_record_id')->nullable()->constrained('employees')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('onboarding_checklist_templates')) {
            Schema::create('onboarding_checklist_templates', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('title', 180);
                $table->string('category', 60);
                $table->string('target_audience', 180);
                $table->string('duration', 80);
                $table->text('description')->nullable();
                $table->json('task_data');
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index('category');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_checklist_templates');

        if (Schema::hasColumn('onboarding_journeys', 'employee_record_id')) {
            Schema::table('onboarding_journeys', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('employee_record_id');
            });
        }
    }
};
