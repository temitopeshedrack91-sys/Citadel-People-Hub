<?php

namespace App\Repositories;

use App\Models\Department;
use App\Models\Entity;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Data access layer for company entities and departments.
 */
class OrganizationRepository
{
    /** @return Collection<int, Entity> */
    public function listEntities(?string $restrictedEntityId = null): Collection
    {
        $normalized = Entity::normalizeEntityId($restrictedEntityId);

        return Entity::query()
            ->withCount('departments')
            ->when($normalized !== null, fn ($query) => $query->whereKey($normalized))
            ->orderBy('name')
            ->get();
    }

    public function findEntity(string $entityId): ?Entity
    {
        $normalized = Entity::normalizeEntityId($entityId) ?? $entityId;

        return Entity::query()->whereKey($normalized)->first();
    }

    /** @return Collection<int, Department> */
    public function listDepartments(?string $entityId = null, bool $activeOnly = false, ?int $restrictedDepartmentId = null): Collection
    {
        $query = Department::query()->with('entity');

        if ($entityId !== null && trim($entityId) !== '' && strtolower(trim($entityId)) !== 'all') {
            $normalized = Entity::normalizeEntityId($entityId) ?? $entityId;
            $query->where('entity_id', $normalized);
        }

        if ($restrictedDepartmentId !== null) {
            $query->whereKey($restrictedDepartmentId);
        }

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        return $query->orderBy('name')->limit(500)->get();
    }

    public function findDepartment(int|string $departmentId): ?Department
    {
        $normalized = Department::normalizeDepartmentId($departmentId);
        if (! is_numeric($normalized)) {
            return null;
        }

        return Department::query()->with('entity')->whereKey((int) $normalized)->first();
    }

    /**
     * Enforce that a department belongs to the specified entity, failing with 422 otherwise.
     *
     * @throws ValidationException
     */
    public function assertDepartmentBelongsToEntity(int|string $departmentId, string $entityId): Department
    {
        $department = $this->findDepartment($departmentId);
        $normalizedEntityId = Entity::normalizeEntityId($entityId) ?? $entityId;

        if ($department === null || (string) $department->entity_id !== (string) $normalizedEntityId) {
            throw ValidationException::withMessages([
                'departmentId' => ['The selected department does not belong to the selected entity.'],
            ]);
        }

        return $department;
    }
}
