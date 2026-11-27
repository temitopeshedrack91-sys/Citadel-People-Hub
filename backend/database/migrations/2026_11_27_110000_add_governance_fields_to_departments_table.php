<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('departments')) {
            return;
        }

        Schema::table('departments', function (Blueprint $table) {
            if (! Schema::hasColumn('departments', 'business_head_name')) {
                $table->string('business_head_name')->nullable()->after('head_of_department_name');
            }
            if (! Schema::hasColumn('departments', 'head_email')) {
                $table->string('head_email')->nullable()->after('business_head_name');
            }
            if (! Schema::hasColumn('departments', 'reports_to')) {
                $table->string('reports_to')->nullable()->after('head_email');
            }
            if (! Schema::hasColumn('departments', 'is_gec_shared_service')) {
                $table->boolean('is_gec_shared_service')->default(false)->after('reports_to');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('departments')) {
            return;
        }

        Schema::table('departments', function (Blueprint $table) {
            foreach (['is_gec_shared_service', 'reports_to', 'head_email', 'business_head_name'] as $column) {
                if (Schema::hasColumn('departments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
