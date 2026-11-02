# Implementation report

**Date:** 2026-10-30

## Work completed

- Researched NotchHR public official materials. No authorized demo access was available, so the product analysis separates documented claims from unverified behavior.
- Audited Citadel's React/Vite frontend, Laravel API, migrations/models, Supabase migration files, and connected Supabase metadata.
- Added a `TaskProjectAccess` service that scopes task and project query access by current Citadel roles.
- Restricted employee project visibility to membership and task visibility to assigned tasks. Employees may change the status of their assigned tasks but may not edit task details or administer projects.
- Restricted department-head and business-head project/task access to their department/entity. Existing global administrative roles retain their current broad management behavior.
- Added record-level visibility checks for project/task reads, updates, deletes, status changes, and comments. Out-of-scope resources return not found; unauthorized actions on visible resources return forbidden.
- Validated task project/department consistency and assignee entity scope. Validated project member entity scope when the project has a department and single-entity membership when it does not. Task comments now create audit entries.
- Scoped `/api/v1/leave/balances` by role and `/api/v1/employees/{employeeId}/leave-balances` by employee/entity/department access. Unscoped system-admin users receive no balances.
- Made Laravel the only authentication provider whenever `VITE_API_BASE_URL` is configured. Existing Sanctum tokens are restored through `/auth/user`; a Supabase session can no longer satisfy Laravel authentication.
- Removed role selection from public Supabase signup. Signup now uses standard Supabase Auth, sends only display-name metadata, and receives the low-privilege role from the Auth trigger. Supabase-only authorization reads the caller's own `profiles` row rather than editable user metadata.
- Disabled local persona authentication by default, limited persona data to development builds, and require `VITE_ENABLE_LOCAL_DEMO_AUTH=true` with no Laravel API for demo sign-in.
- Prepared a Supabase migration to harden the Auth trigger, revoke browser execution of role-assigning registration helpers, and reduce `profiles` to self-row reads. Added 10 pgTAP assertions. The migration remains unapplied pending isolated PostgreSQL verification.
- Updated existing Symfony/Mime from 8.1.7 to patched 8.1.10 and `symfony/polyfill-mbstring` from 1.43.0 to 1.43.3. Composer reported no remaining advisories.
- Created all requested analysis, API, data architecture, business rules, workflow, gap, implementation, and testing documents in this directory.

## Files created

- `backend/app/Services/TaskProjectAccess.php`
- `src/__tests__/authMode.test.ts`
- `src/__tests__/supabaseAuth.test.ts`
- `src/utils/authMode.ts`
- `supabase/migrations/20261030150850_harden_auth_registration_and_profiles.sql`
- `supabase/tests/auth_registration_profiles_test.sql`
- `docs/reverse-engineering/notchhr-product-analysis.md`
- `docs/reverse-engineering/backend-functional-analysis.md`
- `docs/reverse-engineering/api-specification.md`
- `docs/reverse-engineering/database-architecture.md`
- `docs/reverse-engineering/business-rules.md`
- `docs/reverse-engineering/workflow-diagrams.md`
- `docs/reverse-engineering/gap-analysis.md`
- `docs/reverse-engineering/implementation-report.md`
- `docs/reverse-engineering/testing-report.md`
- `docs/reverse-engineering/supabase-security-identity-reconciliation.md`

`existing-system-audit.md` was created during the initial audit and later updated with read-only live metadata and implementation status.

## Files modified

- `backend/app/Http/Controllers/Api/TaskController.php`
- `backend/app/Http/Controllers/Api/ProjectController.php`
- `backend/app/Http/Controllers/Api/LeaveController.php`
- `backend/tests/Feature/ProjectsAndTasksApiTest.php`
- `backend/tests/Feature/PeopleHubApiTest.php`
- `backend/composer.lock`
- `src/components/auth/AuthPage.tsx`
- `src/components/auth/LoginModal.tsx`
- `src/context/AuthContext.tsx`
- `src/services/supabaseService.ts`

Laravel Boost was installed because the original backend agent instructions required it. That setup also updated `backend/composer.json`, `backend/AGENTS.md`, and `backend/CLAUDE.md`, and added Boost metadata/skill files under `backend/`; these files are visible in the repository diff.

## API and schema impact

- No routes or request/response shapes were added. Existing project/task and leave-balance routes now enforce object scope.
- No Laravel database migration was required for the task/leave access changes; they use existing `department_id`, `entity_id`, employee, membership, and assignment relationships. A candidate Supabase Auth/profile migration was created but remains unapplied pending isolated PostgreSQL testing.
- No production database write, migration, policy update, or storage change was performed. Read-only aggregate identity matching compared normalized account emails and employee staff IDs; raw names/emails and sensitive HR fields were not returned.

## Remaining work and limits

- Live Supabase `Citadel` (`czbwedtrnzlfpdbzlnim`) still has broad grants and permissive policies on sensitive tables, public buckets and public role-registration RPC access. The local migration does not address those other tables or buckets and is not a full security clearance. Seven of eight accounts are aggregate exact candidates across Auth, Laravel user and employee identifiers; none were automatically linked.
- No RLS policy behavior test has passed yet. The project does not support Supabase branches on its current plan, and `supabase test db` could not connect to a local Postgres service on port 54322. The candidate pgTAP file and policy matrix must be run against an isolated staging project before rollout.
- A direct database URI from an ignored local environment file appeared in tool output during inspection. Rotate that database password and update active clients; it was not changed as rotation can interrupt connections.
- NotchHR authenticated functionality, endpoints, payloads, roles, and database behavior remain unverified. The product report contains only official public descriptions.
- Trellis remains on its direct Supabase path and has string-ID/data-contract differences from the Laravel task API. It was not switched because production schema/identity compatibility is unresolved.
- Attendance shifts/import/correction processing, leave accrual/ledger, payroll rule versioning/snapshots and attendance integration, employee invitation/profile self-service, announcements and durable reminders remain unimplemented because business rules and identity/data paths are not established.
- PostgreSQL production migration behavior, live Supabase row-policy behavior after remediation, and end-to-end browser workflows were not validated.
