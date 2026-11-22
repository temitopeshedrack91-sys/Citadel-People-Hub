<?php

namespace App\Services;

use App\Models\ClaimEvent;
use App\Models\ClaimExpense;
use App\Models\ClaimRequest;
use App\Models\Employee;
use App\Models\ExpenseType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class ClaimService
{
    /**
     * Create a new Claim Request with optional initial expense line items.
     */
    public function createClaimRequest(array $payload, ?User $creator = null): ClaimRequest
    {
        return DB::transaction(function () use ($payload, $creator) {
            $employee = Employee::findOrFail($payload['employee_id']);
            $claimEvent = ClaimEvent::findOrFail($payload['claim_event_id']);

            $year = Carbon::now()->year;
            $count = ClaimRequest::whereYear('created_at', $year)->count() + 1;
            $claimNumber = sprintf('CLM-%d-%04d', $year, $count);

            $initialStatus = strtoupper($payload['status'] ?? ClaimRequest::STATUS_INITIATED);
            if (! in_array($initialStatus, [ClaimRequest::STATUS_INITIATED, ClaimRequest::STATUS_SUBMITTED], true)) {
                $initialStatus = ClaimRequest::STATUS_INITIATED;
            }

            $claim = ClaimRequest::create([
                'claim_number' => $claimNumber,
                'employee_id' => $employee->id,
                'claim_event_id' => $claimEvent->id,
                'currency' => $payload['currency'] ?? 'NGN',
                'description' => $payload['description'] ?? null,
                'remarks' => $payload['remarks'] ?? null,
                'status' => $initialStatus,
                'submitted_at' => $initialStatus === ClaimRequest::STATUS_SUBMITTED ? now() : null,
                'total_amount' => 0,
            ]);

            if (! empty($payload['expenses']) && is_array($payload['expenses'])) {
                foreach ($payload['expenses'] as $expData) {
                    $this->addExpenseItem($claim, $expData);
                }
            }

            return $claim->fresh(['employee', 'claimEvent', 'expenses.expenseType']);
        });
    }

    /**
     * Add an itemized expense line item to a claim request.
     */
    public function addExpenseItem(ClaimRequest $claim, array $payload): ClaimExpense
    {
        if (in_array($claim->status, [ClaimRequest::STATUS_APPROVED, ClaimRequest::STATUS_PAID, ClaimRequest::STATUS_CANCELLED], true)) {
            throw new RuntimeException("Cannot add expenses to a claim in '{$claim->status}' status.");
        }

        $expenseType = ExpenseType::findOrFail($payload['expense_type_id']);

        $expense = ClaimExpense::create([
            'claim_request_id' => $claim->id,
            'expense_type_id' => $expenseType->id,
            'expense_date' => $payload['expense_date'] ?? now()->format('Y-m-d'),
            'amount' => $payload['amount'],
            'currency' => $payload['currency'] ?? $claim->currency,
            'note' => $payload['note'] ?? null,
            'receipt_url' => $payload['receipt_url'] ?? null,
        ]);

        $claim->recalculateTotal();

        return $expense;
    }

    /**
     * Remove an expense item and recalculate claim total.
     */
    public function removeExpenseItem(ClaimExpense $expense): void
    {
        $claim = $expense->claimRequest;
        if (in_array($claim->status, [ClaimRequest::STATUS_APPROVED, ClaimRequest::STATUS_PAID, ClaimRequest::STATUS_CANCELLED], true)) {
            throw new RuntimeException("Cannot modify expenses for a claim in '{$claim->status}' status.");
        }

        $expense->delete();
        $claim->recalculateTotal();
    }

    /**
     * Perform workflow state transitions adhering to OrangeHRM Claim state machine.
     * Transitions:
     * - SUBMIT: INITIATED -> SUBMITTED
     * - APPROVE: SUBMITTED -> APPROVED
     * - REJECT: SUBMITTED -> REJECTED
     * - CANCEL: INITIATED / SUBMITTED -> CANCELLED
     * - PAY: APPROVED -> PAID
     */
    public function performAction(ClaimRequest $claim, string $action, ?User $actor = null, ?string $reason = null): ClaimRequest
    {
        $normalizedAction = strtoupper(trim($action));

        switch ($normalizedAction) {
            case 'SUBMIT':
                if ($claim->status !== ClaimRequest::STATUS_INITIATED) {
                    throw new RuntimeException("Cannot submit a claim in '{$claim->status}' status. Only INITIATED claims can be submitted.");
                }
                $claim->status = ClaimRequest::STATUS_SUBMITTED;
                $claim->submitted_at = now();
                break;

            case 'APPROVE':
                if ($claim->status !== ClaimRequest::STATUS_SUBMITTED) {
                    throw new RuntimeException("Cannot approve a claim in '{$claim->status}' status. Only SUBMITTED claims can be approved.");
                }
                $claim->status = ClaimRequest::STATUS_APPROVED;
                $claim->approved_at = now();
                $claim->approved_by = $actor?->id;
                break;

            case 'REJECT':
                if ($claim->status !== ClaimRequest::STATUS_SUBMITTED) {
                    throw new RuntimeException("Cannot reject a claim in '{$claim->status}' status. Only SUBMITTED claims can be rejected.");
                }
                if (empty($reason)) {
                    throw new InvalidArgumentException("A rejection reason is required when rejecting a claim request.");
                }
                $claim->status = ClaimRequest::STATUS_REJECTED;
                $claim->rejection_reason = $reason;
                break;

            case 'CANCEL':
                if (! in_array($claim->status, [ClaimRequest::STATUS_INITIATED, ClaimRequest::STATUS_SUBMITTED], true)) {
                    throw new RuntimeException("Cannot cancel a claim in '{$claim->status}' status.");
                }
                $claim->status = ClaimRequest::STATUS_CANCELLED;
                break;

            case 'PAY':
                if ($claim->status !== ClaimRequest::STATUS_APPROVED) {
                    throw new RuntimeException("Cannot mark claim as paid in '{$claim->status}' status. Claim must be APPROVED first.");
                }
                $claim->status = ClaimRequest::STATUS_PAID;
                $claim->paid_at = now();
                $claim->paid_by = $actor?->id;
                break;

            default:
                throw new InvalidArgumentException("Unrecognized claim action '{$action}'. Valid actions are SUBMIT, APPROVE, REJECT, CANCEL, PAY.");
        }

        $claim->save();

        return $claim->fresh(['employee', 'claimEvent', 'expenses.expenseType', 'approver', 'payer']);
    }
}
