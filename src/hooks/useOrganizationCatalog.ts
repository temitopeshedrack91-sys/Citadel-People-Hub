/**
 * Shared hook to load live organizational catalogs (entities, departments, job titles, pay grades)
 * from the configured backend/repositories with explicit loading, error, and retry handling.
 */

import { useCallback, useEffect, useState } from 'react';
import type { CitadelDepartment, CitadelEntity, JobTitle, PayGrade } from '../types';
import { classificationRepository, organizationRepository } from '../services';
import { useRealtimeTable } from './useRealtimeTable';

export interface OrganizationCatalogState {
  entities: CitadelEntity[];
  departments: CitadelDepartment[];
  jobTitles: JobTitle[];
  payGrades: PayGrade[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useOrganizationCatalog(options?: {
  includeClassifications?: boolean;
}): OrganizationCatalogState {
  const includeClassifications = options?.includeClassifications ?? false;
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entList, deptList, titles, grades] = await Promise.all([
        organizationRepository.getEntities(),
        organizationRepository.getDepartments(),
        includeClassifications
          ? classificationRepository.getJobTitles().catch(() => [] as JobTitle[])
          : Promise.resolve([] as JobTitle[]),
        includeClassifications
          ? classificationRepository.getPayGrades().catch(() => [] as PayGrade[])
          : Promise.resolve([] as PayGrade[]),
      ]);

      setEntities(Array.isArray(entList) ? entList : []);
      setDepartments(Array.isArray(deptList) ? deptList : []);
      if (includeClassifications) {
        setJobTitles(Array.isArray(titles) ? titles : []);
        setPayGrades(Array.isArray(grades) ? grades : []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load organizational entities and departments.'
      );
    } finally {
      setLoading(false);
    }
  }, [includeClassifications]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onAuthChanged = () => void reload();
    window.addEventListener('citadel:auth-changed', onAuthChanged);
    return () => window.removeEventListener('citadel:auth-changed', onAuthChanged);
  }, [reload]);

  useRealtimeTable('entities', () => {
    void reload();
  });

  useRealtimeTable('departments', () => {
    void reload();
  });

  return {
    entities,
    departments,
    jobTitles,
    payGrades,
    loading,
    error,
    reload,
  };
}
