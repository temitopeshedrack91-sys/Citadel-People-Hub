<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('employees', 'biometric_device_id')) {
            Schema::table('employees', function (Blueprint $table): void {
                $table->string('biometric_device_id', 100)->nullable()->unique();
            });
        }

        if (! Schema::hasTable('biometric_attendance_punches')) {
            Schema::create('biometric_attendance_punches', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
                $table->string('employee_staff_id', 50)->nullable();
                $table->string('scope_entity_id', 100)->nullable();
                $table->unsignedBigInteger('scope_department_id')->nullable();
                $table->string('device_id', 100);
                $table->string('local_timestamp', 19);
                $table->date('punch_date');
                $table->time('punch_time');
                $table->string('direction', 12)->default('unknown');
                $table->string('raw_direction', 80)->nullable();
                $table->unsignedInteger('source_line')->nullable();
                $table->uuid('import_batch_id');
                $table->string('file_name', 255)->nullable();
                $table->foreignId('imported_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('imported_at');
                $table->char('punch_identity_hash', 64)->unique();
                $table->timestamps();
                $table->index(['employee_id', 'punch_date']);
                $table->index(['punch_date', 'local_timestamp']);
                $table->index('import_batch_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_attendance_punches');

        if (Schema::hasColumn('employees', 'biometric_device_id')) {
            Schema::table('employees', function (Blueprint $table): void {
                $table->dropUnique(['biometric_device_id']);
                $table->dropColumn('biometric_device_id');
            });
        }
    }
};
