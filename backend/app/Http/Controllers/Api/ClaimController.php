<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClaimEvent;
use App\Models\ClaimExpense;
use App\Models\ClaimRequest;
use App\Models\Employee;
use App\Models\ExpenseType;
use App\Services\ClaimService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Manages Employee Expense Claims, Claim Events, Expense Types, and Settlement Actions.
 * Replicates OrangeHRM Claim Management workflow with full audit logging and RBAC enforcement.
 */
class ClaimController extends Controller
{
    public function __construct(
        private readonly ClaimService $claimService
    ) {}

    // ==========================================
    // Claim Events & Expense Types Configuration
    // ==========================================

    public function events(Request $request): JsonResponse
    {
        $events = ClaimEvent::query()
            ->when($request->boolean('activeOnly', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $events]);
    }

    public function storeEvent(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:claim_events,name'],
            'code' => ['nullable', 'string', 'max:40', 'unique:claim_events,code'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['sometimes', 'string', Rule::in(['Active', 'Inactive'])],
        ]);

        $event = ClaimEvent::create([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'Active',
            'is_active' => ($validated['status'] ?? 'Active') === 'Active',
        ]);

        AuditLogger::record($request, 'Claims', 'Created Claim Event', (string) $event->id, $event->name, null, 'Active');

        return response()->json(['data' => $event], 201);
    }

    public function expenseTypes(Request $request): JsonResponse
    {
        $types = ExpenseType::query()
            ->when($request->boolean('activeOnly', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $types]);
    }

    public function storeExpenseType(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:expense_types,name'],
            'code' => ['nullable', 'string', 'max:40', 'unique:expense_types,code'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['sometimes', 'string', Rule::in(['Active', 'Inactive'])],
        ]);

        $type = ExpenseType::create([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'Active',
            'is_active' => ($validated['status'] ?? 'Active') === 'Active',
        ]);

        AuditLogger::record($request, 'Claims', 'Created Expense Type', (string) $type->id, $type->name, null, 'Active');

        return response()->json(['data' => $type], 201);
    }

    // ==========================================
    // Claim Requests & Line Items
    // ==========================================

    public function requests(Request $request): JsonResponse
    {
        $user = $request->user();
        $canonicalRole = RoleAuthorization::canonical($user->role);

        $query = ClaimRequest::query()
            ->with(['employee', 'claimEvent', 'expenses.expenseType', 'approver', 'payer'])
            ->orderByDesc('created_at');

        // RBAC Scoping: Employees see only their own claims unless elevated
        if ($canonicalRole === 'EMPLOYEE') {
            $linkedEmp = Employee::where('staff_id', $user->staff_id)->first();
            if ($linkedEmp) {
                $query->where('employee_id', $linkedEmp->id);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($request->filled('employee_id')) {
            $query->where('employee_id', $request->input('employee_id'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', strtoupper($request->input('status')));
        }

        if ($request->filled('claim_event_id')) {
            $query->where('claim_event_id', $request->input('claim_event_id'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->input('search').'%';
            $query->where(function ($q) use ($search) {
                $q->where('claim_number', 'like', $search)
                    ->orWhere('description', 'like', $search)
                    ->orWhereHas('employee', fn ($eq) => $eq->where('full_name', 'like', $search)->orWhere('staff_id', 'like', $search));
            });
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(Request $request, ClaimRequest $claimRequest): JsonResponse
    {
        $this->authorizeClaimAccess($request, $claimRequest);

        return response()->json([
            'data' => $claimRequest->load(['employee', 'claimEvent', 'expenses.expenseType', 'approver', 'payer']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $canonicalRole = RoleAuthorization::canonical($user->role);

        $validated = $request->validate([
            'employee_id' => ['sometimes', 'nullable', 'integer'],
            'claim_event_id' => ['required', 'integer', 'exists:claim_events,id'],
            'currency' => ['sometimes', 'string', 'max:10'],
            'description' => ['nullable', 'string', 'max:2000'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'status' => ['sometimes', Rule::in(['INITIATED', 'SUBMITTED'])],
            'expenses' => ['sometimes', 'array'],
            'expenses.*.expense_type_id' => ['required_with:expenses', 'integer', 'exists:expense_types,id'],
            'expenses.*.expense_date' => ['required_with:expenses', 'date'],
            'expenses.*.amount' => ['required_with:expenses', 'numeric', 'min:0.01'],
            'expenses.*.note' => ['nullable', 'string', 'max:1000'],
            'expenses.*.receipt_url' => ['nullable', 'string', 'max:2000'],
        ]);

        // Auto-resolve employee_id if not supplied or if current user is an employee
        if (empty($validated['employee_id']) || $canonicalRole === 'EMPLOYEE') {
            $emp = Employee::where('staff_id', $user->staff_id)->firstOrFail();
            $validated['employee_id'] = $emp->id;
        }

        $claim = $this->claimService->createClaimRequest($validated, $user);

        AuditLogger::record(
            $request,
            'Claims',
            'Created Claim Request',
            (string) $claim->id,
            "{$claim->claim_number} ({$claim->claimEvent?->name})",
            null,
            $claim->status
        );

        return response()->json(['data' => $claim], 201);
    }

    public function addExpense(Request $request, ClaimRequest $claimRequest): JsonResponse
    {
        $this->authorizeClaimAccess($request, $claimRequest);

        $validated = $request->validate([
            'expense_type_id' => ['required', 'integer', 'exists:expense_types,id'],
            'expense_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['sometimes', 'string', 'max:10'],
            'note' => ['nullable', 'string', 'max:1000'],
            'receipt_url' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $expense = $this->claimService->addExpenseItem($claimRequest, $validated);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'error' => 'Bad Request'], 400);
        }

        AuditLogger::record(
            $request,
            'Claims',
            'Added Expense Line Item',
            (string) $expense->id,
            "Claim {$claimRequest->claim_number}: ₦".number_format($expense->amount, 2),
            null,
            'Added'
        );

        return response()->json(['data' => $claimRequest->fresh(['employee', 'claimEvent', 'expenses.expenseType'])], 201);
    }

    public function deleteExpense(Request $request, mixed $first, mixed $second = null): JsonResponse
    {
        $claimExpense = $second instanceof ClaimExpense
            ? $second
            : ($first instanceof ClaimExpense ? $first : ClaimExpense::findOrFail($second ?? $first));

        $claim = $claimExpense->claimRequest;
        $this->authorizeClaimAccess($request, $claim);

        try {
            $this->claimService->removeExpenseItem($claimExpense);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'error' => 'Bad Request'], 400);
        }

        AuditLogger::record(
            $request,
            'Claims',
            'Deleted Expense Line Item',
            (string) $claimExpense->id,
            "Claim {$claim->claim_number}",
            'Active',
            'Deleted'
        );

        return response()->json(['data' => $claim->fresh(['employee', 'claimEvent', 'expenses.expenseType'])]);
    }

    public function action(Request $request, ClaimRequest $claimRequest): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['SUBMIT', 'APPROVE', 'REJECT', 'CANCEL', 'PAY'])],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $action = strtoupper($validated['action']);
        $user = $request->user();
        $canonicalRole = RoleAuthorization::canonical($user->role);

        // Authorization checks on specific actions
        if (in_array($action, ['APPROVE', 'REJECT', 'PAY'], true)) {
            abort_unless(
                in_array($canonicalRole, ['ADMIN', 'HR_STAFF'], true) ||
                in_array($user->role, ['BUSINESS_HEAD', 'DEPARTMENT_HEAD', 'PCCM_SUPER_ADMIN'], true),
                403,
                'Unauthorized to approve, reject, or pay claim requests.'
            );
        }

        $prevStatus = $claimRequest->status;

        try {
            $updated = $this->claimService->performAction($claimRequest, $action, $user, $validated['reason'] ?? null);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'error' => 'Bad Request'], 400);
        }

        AuditLogger::record(
            $request,
            'Claims',
            "Claim Action: {$action}",
            (string) $updated->id,
            $updated->claim_number,
            $prevStatus,
            $updated->status
        );

        return response()->json(['data' => $updated]);
    }

    // ==========================================
    // Internal Authorization Helpers
    // ==========================================

    private function authorizeAdminOrHr(Request $request): void
    {
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($request->user()), 403, 'Unauthorized.');
    }

    private function authorizeClaimAccess(Request $request, ClaimRequest $claim): void
    {
        $user = $request->user();
        $canonical = RoleAuthorization::canonical($user->role);

        if (in_array($canonical, ['ADMIN', 'HR_STAFF'], true)) {
            return;
        }

        $linkedEmp = Employee::where('staff_id', $user->staff_id)->first();
        if ($linkedEmp && $claim->employee_id === $linkedEmp->id) {
            return;
        }

        abort(403, 'Access denied to this claim record.');
    }
}
