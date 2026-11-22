<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Training Courses, Training Sessions, and Employee Training Records.
     * Replicates corporate skill building and session tracking behavior.
     */
    public function up(): void
    {
        if (! Schema::hasTable('training_courses')) {
            Schema::create('training_courses', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('code', 40)->unique();
                $table->text('description')->nullable();
                $table->string('trainer_provider')->nullable();
                $table->decimal('duration_hours', 5, 2)->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('training_sessions')) {
            Schema::create('training_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
                $table->string('session_name');
                $table->date('start_date');
                $table->date('end_date');
                $table->string('delivery_method', 30)->default('In-Person'); // In-Person, Online, Hybrid
                $table->string('location_or_url')->nullable();
                $table->unsignedSmallInteger('max_capacity')->default(25);
                $table->string('status', 30)->default('Scheduled'); // Scheduled, In Progress, Completed, Cancelled
                $table->timestamps();

                $table->index(['course_id', 'status']);
            });
        }

        if (! Schema::hasTable('employee_trainings')) {
            Schema::create('employee_trainings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('session_id')->constrained('training_sessions')->cascadeOnDelete();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('status', 30)->default('Enrolled'); // Enrolled, Attended, Completed, Incomplete
                $table->date('completion_date')->nullable();
                $table->decimal('score', 5, 2)->nullable();
                $table->text('feedback')->nullable();
                $table->timestamps();

                $table->unique(['session_id', 'employee_id']);
                $table->index(['employee_id', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_trainings');
        Schema::dropIfExists('training_sessions');
        Schema::dropIfExists('training_courses');
    }
};
