<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Entity;
use App\Repositories\OrganizationRepository;
use App\Services\RealtimeEventService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrganizationController extends Controller
{
    public function __construct(
        private readonly OrganizationRepository $organizations
    ) {}

    public function entities(Request $request): JsonResponse
    {
        $rawRole = strtoupper(trim($request->user()->role ?? ''));
        $restrictedEntityId = in_array($rawRole, ['BUSINESS_HEAD', 'DEPARTMENT_HEAD'], true)
            ? $request->user()->entity_id
            : null;
        $entities = $this->organizations->listEntities($restrictedEntityId);

        $employeeCounts = DB::table('employees')
            ->select('entity_id', DB::raw('COUNT(*) as total'))
            ->groupBy('entity_id')
            ->pluck('total', 'entity_id');

        return response()->json(['data' => $entities->map(fn (Entity $entity) => [
            'id' => $entity->id,
            'name' => $entity->name,
            'shortCode' => $entity->short_code,
            'code' => $entity->short_code,
            'description' => $entity->description,
            'headOfEntity' => $entity->head_of_entity,
            'isActive' => $entity->is_active,
            'departmentCount' => (int) ($entity->departments_count ?? $entity->departments()->count()),
            'employeeCount' => (int) ($employeeCounts[$entity->id] ?? 0),
        ])]);
    }

    public function createEntity(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'shortCode' => ['required', 'string', 'max:30', 'alpha_dash', 'unique:entities,short_code'],
            'description' => ['nullable', 'string', 'max:2000'],
            'headOfEntity' => ['nullable', 'string', 'max:180'],
            'isActive' => ['sometimes', 'boolean'],
        ]);
        $entity = DB::transaction(function () use ($request, $data) {
            $entity = Entity::create([
                'id' => strtoupper($data['shortCode']),
                'name' => $data['name'],
                'short_code' => strtoupper($data['shortCode']),
                'description' => $data['description'] ?? null,
                'head_of_entity' => $data['headOfEntity'] ?? null,
                'is_active' => $data['isActive'] ?? true,
            ]);
            AuditLogger::record($request, 'Organization Settings', 'Created entity', $entity->id, $entity->name, null, $entity->short_code);
            RealtimeEventService::publish('entities', 'INSERT', $entity->id, ['name' => $entity->name], (int) $request->user()->id);

            return $entity;
        });

        return response()->json(['data' => [
            'id' => $entity->id,
            'name' => $entity->name,
            'shortCode' => $entity->short_code,
            'code' => $entity->short_code,
            'description' => $entity->description,
            'headOfEntity' => $entity->head_of_entity,
            'isActive' => $entity->is_active,
            'departmentCount' => 0,
            'employeeCount' => 0,
        ]], 201);
    }

    public function departments(Request $request): JsonResponse
    {
        $rawRole = strtoupper(trim($request->user()->role ?? ''));
        $entityId = $request->filled('entityId')
            ? $request->string('entityId')->toString()
            : ($request->filled('entity_id') ? $request->string('entity_id')->toString() : null);

        if ($entityId !== null && strtolower(trim($entityId)) === 'all') {
            $entityId = null;
        }

        $restrictedDepartmentId = null;
        if ($rawRole === 'BUSINESS_HEAD' && $request->user()->entity_id !== null) {
            $entityId = $request->user()->entity_id;
        } elseif ($rawRole === 'DEPARTMENT_HEAD' && $request->user()->department_id !== null) {
            $restrictedDepartmentId = (int) $request->user()->department_id;
            if ($request->user()->entity_id !== null) {
                $entityId = $request->user()->entity_id;
            }
        }

        $departments = $this->organizations->listDepartments(
            $entityId,
            $request->boolean('activeOnly', false),
            $restrictedDepartmentId
        );

        $employeeCounts = DB::table('employees')
            ->select('department_id', DB::raw('COUNT(*) as total'))
            ->groupBy('department_id')
            ->pluck('total', 'department_id');

        return response()->json(['data' => $departments->map(
            fn (Department $department) => $this->presentDepartment(
                $department,
                (int) ($employeeCounts[$department->id] ?? 0)
            )
        )]);
    }

    public function createDepartment(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        if ($request->filled('entityId')) {
            $request->merge(['entityId' => Entity::normalizeEntityId($request->string('entityId')->toString()) ?? $request->input('entityId')]);
        }

        $data = $request->validate([
            'entityId' => ['required', 'string', 'exists:entities,id'],
            'name' => ['required', 'string', 'max:180'],
            'code' => [
                'required',
                'string',
                'max:30',
                'alpha_dash',
                Rule::unique('departments', 'code')->where('entity_id', $request->input('entityId')),
            ],
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
            RealtimeEventService::publish('departments', 'INSERT', $department->id, ['entityId' => $department->entity_id], (int) $request->user()->id);

            return $department;
        });

        return response()->json(['data' => $this->presentDepartment($department->load('entity'), 0)], 201);
    }

    public function updateDepartment(Request $request, Department $department): JsonResponse
    {
        $this->authorizeAdmin($request);
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
            RealtimeEventService::publish('departments', 'UPDATE', $lockedDepartment->id, ['entityId' => $lockedDepartment->entity_id], (int) $request->user()->id);
        });

        $empCount = (int) DB::table('employees')->where('department_id', $department->id)->count();

        return response()->json(['data' => $this->presentDepartment($department->fresh()->load('entity'), $empCount)]);
    }

    private function presentDepartment(Department $department, ?int $employeeCount = null): array
    {
        return [
            'id' => (string) $department->id,
            'entityId' => $department->entity_id,
            'entityName' => $department->entity?->name,
            'name' => $department->name,
            'code' => $department->code,
            'headOfDepartment' => $department->head_of_department_name,
            'headOfDepartmentName' => $department->head_of_department_name,
            'description' => $department->description,
            'isActive' => $department->is_active,
            'employeeCount' => $employeeCount ?? 0,
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($request->user()), 403, 'Only HR or administrators can manage organizational records.');
    }
}
