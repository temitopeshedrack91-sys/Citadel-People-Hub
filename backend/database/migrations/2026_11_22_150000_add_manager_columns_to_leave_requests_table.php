<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('leave_requests', 'manager_id')) {
                $table->string('manager_id')->nullable()->after('handover_colleague');
            }
            if (! Schema::hasColumn('leave_requests', 'manager_name')) {
                $table->string('manager_name')->nullable()->after('manager_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            if (Schema::hasColumn('leave_requests', 'manager_name')) {
                $table->dropColumn('manager_name');
            }
            if (Schema::hasColumn('leave_requests', 'manager_id')) {
                $table->dropColumn('manager_id');
            }
        });
    }
};
