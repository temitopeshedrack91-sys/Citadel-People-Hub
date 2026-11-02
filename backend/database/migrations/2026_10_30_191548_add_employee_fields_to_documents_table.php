<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignUuid('employee_id')->nullable()->constrained('employees')->cascadeOnDelete()->after('id');
            $table->date('issue_date')->nullable()->after('version');
            $table->date('expiry_date')->nullable()->after('issue_date');
            $table->unsignedInteger('version_number')->default(1)->after('expiry_date');
            $table->string('previous_version_id')->nullable()->after('version_number');
            $table->index(['employee_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropColumn(['employee_id', 'issue_date', 'expiry_date', 'version_number', 'previous_version_id']);
        });
    }
};
