<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayGrade;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Manages enterprise compensation pay grades, salary bands, and currency scales.
 * Replicates the Pay Grade rules of OrangeHRM Admin Plugin.
 */
class PayGradeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PayGrade::query()->orderBy('name');
        if ($request->boolean('activeOnly', true)) {
            $query->where('is_active', true);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(PayGrade $payGrade): JsonResponse
    {
        return response()->json(['data' => $payGrade]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:180', 'unique:pay_grades,name'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'minSalary' => ['required', 'numeric', 'min:0'],
            'maxSalary' => ['required', 'numeric', 'gte:minSalary'],
            'description' => ['nullable', 'string', 'max:2000'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $payGrade = DB::transaction(function () use ($request, $data) {
            $payGrade = PayGrade::create([
                'name' => $data['name'],
                'currency' => strtoupper($data['currency'] ?? 'NGN'),
                'min_salary' => $data['minSalary'],
                'max_salary' => $data['maxSalary'],
                'description' => $data['description'] ?? null,
                'is_active' => $data['isActive'] ?? true,
            ]);

            AuditLogger::record($request, 'Pay Grades', 'Created Pay Grade', (string) $payGrade->id, $payGrade->name, null, 'Active');

            return $payGrade;
        });

        return response()->json(['data' => $payGrade], 201);
    }

    public function update(Request $request, PayGrade $payGrade): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:180', Rule::unique('pay_grades', 'name')->ignore($payGrade->id)],
            'currency' => ['sometimes', 'string', 'size:3'],
            'minSalary' => ['sometimes', 'numeric', 'min:0'],
            'maxSalary' => ['sometimes', 'numeric'],
            'description' => ['nullable', 'string', 'max:2000'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $minSalary = $data['minSalary'] ?? $payGrade->min_salary;
        $maxSalary = $data['maxSalary'] ?? $payGrade->max_salary;
        if ((float) $maxSalary < (float) $minSalary) {
            abort(422, 'The maximum salary must be greater than or equal to the minimum salary.');
        }

        $updated = DB::transaction(function () use ($request, $payGrade, $data, $minSalary, $maxSalary) {
            $previousName = $payGrade->name;
            $payGrade->update([
                'name' => $data['name'] ?? $payGrade->name,
                'currency' => isset($data['currency']) ? strtoupper($data['currency']) : $payGrade->currency,
                'min_salary' => $minSalary,
                'max_salary' => $maxSalary,
                'description' => array_key_exists('description', $data) ? $data['description'] : $payGrade->description,
                'is_active' => $data['isActive'] ?? $payGrade->is_active,
            ]);

            AuditLogger::record($request, 'Pay Grades', 'Updated Pay Grade', (string) $payGrade->id, $payGrade->name, $previousName, $payGrade->name);

            return $payGrade;
        });

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, PayGrade $payGrade): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        DB::transaction(function () use ($request, $payGrade) {
            $name = $payGrade->name;
            $payGrade->delete();
            AuditLogger::record($request, 'Pay Grades', 'Deleted Pay Grade', (string) $payGrade->id, $name, 'Active', 'Deleted');
        });

        return response()->json(['message' => 'Pay grade deleted successfully.']);
    }

    private function authorizeAdminOrHr(Request $request): void
    {
        $role = RoleAuthorization::canonical($request->user()->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF'], true), 403, 'You are not authorized to manage pay grades.');
    }
}
