<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Employee Claims & Expense Reimbursements.
     * Replicates OrangeHRM claim events, expense types, claim requests, and itemized line items.
     */
    public function up(): void
    {
        if (! Schema::hasTable('claim_events')) {
            Schema::create('claim_events', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120)->unique();
                $table->string('code', 40)->nullable()->unique();
                $table->text('description')->nullable();
                $table->string('status', 20)->default('Active'); // Active, Inactive
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('expense_types')) {
            Schema::create('expense_types', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120)->unique();
                $table->string('code', 40)->nullable()->unique();
                $table->text('description')->nullable();
                $table->string('status', 20)->default('Active'); // Active, Inactive
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('claim_requests')) {
            Schema::create('claim_requests', function (Blueprint $table) {
                $table->id();
                $table->string('claim_number', 40)->unique();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->foreignId('claim_event_id')->constrained('claim_events')->restrictOnDelete();
                $table->string('currency', 10)->default('NGN');
                $table->text('description')->nullable();
                $table->text('remarks')->nullable();
                $table->string('status', 30)->default('INITIATED'); // INITIATED, SUBMITTED, APPROVED, REJECTED, CANCELLED, PAID
                $table->decimal('total_amount', 14, 2)->default(0);
                $table->dateTime('submitted_at')->nullable();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('approved_at')->nullable();
                $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('paid_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'status']);
                $table->index(['status', 'created_at']);
            });
        }

        if (! Schema::hasTable('claim_expenses')) {
            Schema::create('claim_expenses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('claim_request_id')->constrained('claim_requests')->cascadeOnDelete();
                $table->foreignId('expense_type_id')->constrained('expense_types')->restrictOnDelete();
                $table->date('expense_date');
                $table->decimal('amount', 14, 2);
                $table->string('currency', 10)->default('NGN');
                $table->text('note')->nullable();
                $table->string('receipt_url')->nullable();
                $table->timestamps();

                $table->index(['claim_request_id', 'expense_type_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claim_expenses');
        Schema::dropIfExists('claim_requests');
        Schema::dropIfExists('expense_types');
        Schema::dropIfExists('claim_events');
    }
};
