<?php

namespace App\Repositories;

use App\Models\Department;
use App\Models\Entity;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data access layer for corporate entities and departments.
 */
class OrganizationRepository
{
    /** @return Collection<int, Entity> */
    public function listEntities(?string $restrictedEntityId = null): Collection
    {
        return Entity::query()
            ->when($restrictedEntityId !== null, fn ($query) => $query->whereKey($restrictedEntityId))
            ->orderBy('name')
            ->get();
    }

    /** @return Collection<int, Department> */
    public function listDepartments(?string $entityId = null, bool $activeOnly = false): Collection
    {
        $query = Department::query()->with('entity');

        if ($entityId !== null && $entityId !== '') {
            $normalized = Entity::normalizeEntityId($entityId) ?? $entityId;
            $query->where('entity_id', $normalized);
        }

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        return $query->orderBy('name')->limit(500)->get();
    }

    public function findDepartment(int|string $departmentId): ?Department
    {
        $normalized = Department::normalizeDepartmentId($departmentId);
        if ($normalized === null || ! is_numeric($normalized)) {
            return null;
        }

        return Department::query()->with('entity')->find((int) $normalized);
    }

    public function findEntity(string $entityId): ?Entity
    {
        $normalized = Entity::normalizeEntityId($entityId) ?? $entityId;

        return Entity::query()->find($normalized);
    }
}
