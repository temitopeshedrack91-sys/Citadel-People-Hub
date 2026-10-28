<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Entity;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrganizationController extends Controller
{
    public function entities(Request $request): JsonResponse
    {
        $entities = Entity::query()
            ->when($request->user()->role === 'BUSINESS_HEAD', fn ($query) => $query->whereKey($request->user()->entity_id))
            ->orderBy('name')->get();

        return response()->json(['data' => $entities->map(fn (Entity $entity) => [
            'id' => $entity->id,
            'name' => $entity->name,
            'shortCode' => $entity->short_code,
            'code' => $entity->short_code,
            'description' => $entity->description,
            'headOfEntity' => $entity->head_of_entity,
            'isActive' => $entity->is_active,
            'departmentCount' => $entity->departments()->count(),
        ])]);
    }

    public function createEntity(Request $request): JsonResponse
    {
        $this->authorizeHr($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'shortCode' => ['required', 'string', 'max:30', 'alpha_dash', 'unique:entities,short_code'],
            'description' => ['nullable', 'string', 'max:2000'],
            'headOfEntity' => ['nullable', 'string', 'max:180'],
            'isActive' => ['sometimes', 'boolean'],
        ]);
        $entity = DB::transaction(function () use ($request, $data) {
            $entity = Entity::create([
                'name' => $data['name'],
                'short_code' => strtoupper($data['shortCode']),
                'description' => $data['description'] ?? null,
                'head_of_entity' => $data['headOfEntity'] ?? null,
                'is_active' => $data['isActive'] ?? true,
            ]);
            AuditLogger::record($request, 'Organization Settings', 'Created entity', $entity->id, $entity->name, null, $entity->short_code);

            return $entity;
        });

        return response()->json(['data' => [
            'id' => $entity->id,
            'name' => $entity->name,
            'shortCode' => $entity->short_code,
            'description' => $entity->description,
            'headOfEntity' => $entity->head_of_entity,
            'isActive' => $entity->is_active,
        ]], 201);
    }

    public function departments(Request $request): JsonResponse
    {
        $query = Department::query()->with('entity');
        if ($request->filled('entityId')) {
            $query->where('entity_id', $request->string('entityId')->toString());
        }
        if ($request->user()->role === 'BUSINESS_HEAD') {
            $query->where('entity_id', $request->user()->entity_id);
        }

        return response()->json(['data' => $query->orderBy('name')->limit(500)->get()->map(fn (Department $department) => $this->presentDepartment($department))]);
    }

    public function createDepartment(Request $request): JsonResponse
    {
        $this->authorizeHr($request);
        $data = $request->validate([
            'entityId' => ['required', 'uuid', 'exists:entities,id'],
            'name' => ['required', 'string', 'max:180'],
            'code' => ['required', 'string', 'max:30', 'alpha_dash'],
            'headOfDepartmentName' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'isActive' => ['sometimes', 'boolean'],
        ]);
        $department = DB::transaction(function () use ($request, $data) {
            $department = Department::create([
                'entity_id' => $data['entityId'],
                'name' => $data['name'],
                'code' => strtoupper($data['code']),
                'head_of_department_name' => $data['headOfDepartmentName'] ?? null,
                'description' => $data['description'] ?? null,
                'is_active' => $data['isActive'] ?? true,
            ]);
            AuditLogger::record($request, 'Organization Settings', 'Created department', $department->id, $department->name, null, $department->code);

            return $department;
        });

        return response()->json(['data' => $this->presentDepartment($department->load('entity'))], 201);
    }

    public function updateDepartment(Request $request, Department $department): JsonResponse
    {
        $this->authorizeHr($request);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:180'],
            'code' => ['sometimes', 'string', 'max:30', 'alpha_dash', Rule::unique('departments', 'code')->where('entity_id', $department->entity_id)->ignore($department->id)],
            'headOfDepartmentName' => ['sometimes', 'nullable', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'isActive' => ['sometimes', 'boolean'],
        ]);
        $map = [
            'headOfDepartmentName' => 'head_of_department_name',
            'isActive' => 'is_active',
        ];
        DB::transaction(function () use ($request, $department, $data, $map): void {
            $lockedDepartment = Department::query()->lockForUpdate()->findOrFail($department->id);
            $lockedDepartment->update(collect($data)->mapWithKeys(fn ($value, $key) => [$map[$key] ?? $key => $key === 'code' ? strtoupper($value) : $value])->all());
            AuditLogger::record($request, 'Organization Settings', 'Updated department', $lockedDepartment->id, $lockedDepartment->name, null, 'Updated');
        });

        return response()->json(['data' => $this->presentDepartment($department->fresh()->load('entity'))]);
    }

    private function presentDepartment(Department $department): array
    {
        return [
            'id' => $department->id,
            'entityId' => $department->entity_id,
            'entityName' => $department->entity?->name,
            'name' => $department->name,
            'code' => $department->code,
            'headOfDepartmentName' => $department->head_of_department_name,
            'description' => $department->description,
            'isActive' => $department->is_active,
        ];
    }

    private function authorizeHr(Request $request): void
    {
        abort_unless($request->user()->role === 'PCCM_SUPER_ADMIN', 403, 'Only PCCM administrators can manage organizational records.');
    }
}
