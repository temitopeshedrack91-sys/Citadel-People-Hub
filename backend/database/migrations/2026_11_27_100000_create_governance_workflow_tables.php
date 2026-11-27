<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('profile_change_requests')) {
            Schema::create('profile_change_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('employee_staff_id', 50);
                $table->string('employee_name', 180);
                $table->string('requested_by_name', 180);
                $table->string('requested_by_role', 60);
                $table->json('changes');
                $table->text('reason');
                $table->string('status', 40)->default('PENDING_HR_APPROVAL');
                $table->string('reviewed_by_name', 180)->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->text('review_comments')->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'status']);
                $table->index('status');
            });
        }

        if (! Schema::hasTable('employee_lifecycle_events')) {
            Schema::create('employee_lifecycle_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('employee_staff_id', 50);
                $table->string('employee_name', 180);
                $table->string('event_type', 40);
                $table->string('trigger_reason', 255);
                $table->string('initiated_by_name', 180);
                $table->string('status', 40)->default('PENDING_HR_APPROVAL');
                $table->json('details')->nullable();
                $table->string('approved_by_name', 180)->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'event_type']);
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_lifecycle_events');
        Schema::dropIfExists('profile_change_requests');
    }
};
