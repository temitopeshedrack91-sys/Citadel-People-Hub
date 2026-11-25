<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'manager_id')) {
                $table->string('manager_id')->nullable()->after('confirmation_date');
            }
            if (! Schema::hasIndex('employees', 'employees_manager_id_index')) {
                $table->index('manager_id', 'employees_manager_id_index');
            }
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('leave_requests', 'stopped_at_stage')) {
                $table->string('stopped_at_stage', 40)->nullable()->after('approval_stage');
            }
            if (! Schema::hasColumn('leave_requests', 'manager_actor_id')) {
                $table->unsignedBigInteger('manager_actor_id')->nullable()->after('stopped_at_stage');
            }
            if (! Schema::hasColumn('leave_requests', 'manager_actor_name')) {
                $table->string('manager_actor_name', 180)->nullable()->after('manager_actor_id');
            }
            if (! Schema::hasColumn('leave_requests', 'manager_acted_at')) {
                $table->timestamp('manager_acted_at')->nullable()->after('manager_actor_name');
            }
            if (! Schema::hasColumn('leave_requests', 'hr_actor_id')) {
                $table->unsignedBigInteger('hr_actor_id')->nullable()->after('manager_acted_at');
            }
            if (! Schema::hasColumn('leave_requests', 'hr_actor_name')) {
                $table->string('hr_actor_name', 180)->nullable()->after('hr_actor_id');
            }
            if (! Schema::hasColumn('leave_requests', 'hr_acted_at')) {
                $table->timestamp('hr_acted_at')->nullable()->after('hr_actor_name');
            }
        });

        if (! Schema::hasTable('realtime_events')) {
            Schema::create('realtime_events', function (Blueprint $table) {
                $table->id();
                $table->string('table_name', 80)->index();
                $table->string('event_type', 20);
                $table->string('record_id', 100)->nullable();
                $table->unsignedBigInteger('actor_user_id')->nullable();
                $table->json('payload')->nullable();
                $table->timestamp('created_at')->useCurrent()->index();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('realtime_events');

        Schema::table('leave_requests', function (Blueprint $table) {
            $columns = array_filter([
                'stopped_at_stage',
                'manager_actor_id',
                'manager_actor_name',
                'manager_acted_at',
                'hr_actor_id',
                'hr_actor_name',
                'hr_acted_at',
            ], fn (string $col) => Schema::hasColumn('leave_requests', $col));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasIndex('employees', 'employees_manager_id_index')) {
                $table->dropIndex('employees_manager_id_index');
            }
        });
    }
};
