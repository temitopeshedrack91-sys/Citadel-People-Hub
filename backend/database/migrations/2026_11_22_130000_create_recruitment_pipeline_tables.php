<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Job Vacancies, Candidates, Interviews, and Candidate History.
     * Replicates the ATS workflow state machine and interview tracking of OrangeHRM Recruitment Plugin.
     */
    public function up(): void
    {
        if (! Schema::hasTable('job_vacancies')) {
            Schema::create('job_vacancies', function (Blueprint $table) {
                $table->id();
                $table->foreignUuid('requisition_id')->nullable()->constrained('recruitment_requisitions')->nullOnDelete();
                $table->string('title');
                $table->foreignId('job_title_id')->nullable()->constrained('job_titles')->nullOnDelete();
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
                $table->foreignId('hiring_manager_id')->nullable()->constrained('employees')->nullOnDelete();
                $table->unsignedInteger('positions_count')->default(1);
                $table->text('description')->nullable();
                $table->string('status', 30)->default('Active'); // Active, Closed, On Hold
                $table->timestamps();

                $table->index(['status', 'department_id']);
            });
        }

        if (! Schema::hasTable('candidates')) {
            Schema::create('candidates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vacancy_id')->constrained('job_vacancies')->cascadeOnDelete();
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->index();
                $table->string('phone', 40)->nullable();
                $table->string('resume_url')->nullable();
                $table->string('status', 40)->default('Application Initiated');
                $table->text('notes')->nullable();
                $table->date('applied_date');
                $table->timestamps();

                $table->index(['vacancy_id', 'status']);
            });
        }

        if (! Schema::hasTable('candidate_interviews')) {
            Schema::create('candidate_interviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('candidate_id')->constrained('candidates')->cascadeOnDelete();
                $table->string('interview_title');
                $table->foreignId('interviewer_id')->nullable()->constrained('employees')->nullOnDelete();
                $table->date('scheduled_date');
                $table->string('scheduled_time', 20)->nullable();
                $table->text('notes')->nullable();
                $table->string('result', 30)->default('Pending'); // Pending, Passed, Failed
                $table->timestamps();

                $table->index(['candidate_id', 'scheduled_date']);
            });
        }

        if (! Schema::hasTable('candidate_histories')) {
            Schema::create('candidate_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('candidate_id')->constrained('candidates')->cascadeOnDelete();
                $table->string('action', 60);
                $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['candidate_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidate_histories');
        Schema::dropIfExists('candidate_interviews');
        Schema::dropIfExists('candidates');
        Schema::dropIfExists('job_vacancies');
    }
};
