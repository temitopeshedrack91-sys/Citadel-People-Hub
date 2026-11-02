# Backend functional analysis

**Date:** 2026-10-30  
**Evidence boundary:** Citadel behavior below is based on source and tests; NotchHR details are documented marketing claims only unless explicitly marked otherwise.

## Citadel architecture

The React 19 / Vite / TypeScript frontend has repository adapters for Laravel and Supabase plus a local mock repository. Laravel 13 is a versioned REST API using Sanctum bearer tokens and Eloquent. The backend README assigns authentication, authorization, business logic, file access, and audit responsibility to Laravel, with Supabase/PostgreSQL as storage. The updated auth context now uses Laravel sign-in and `/auth/user` session restoration whenever the API is configured; Supabase-only mode reads authorization role from the current user's protected profile. Trellis still calls Supabase directly, so the data-plane boundary remains inconsistent.

The connected Supabase project was inspected read-only. Its project ID differs from the backend README example; its schema contains legacy and Laravel-like tables, including text-keyed `tasks` while Laravel expects integer task IDs. Aggregate-only identity checks found 7 exact Auth/Laravel-user/employee matches out of 8 accounts; this is not sufficient evidence to auto-link identities. Several live sensitive-table policies grant public-wide access. Do not route more production traffic or apply broad schema/policy changes until the Laravel deployment target, schema compatibility, identity mapping, and intended access model are reconciled.

## Module inventory

| Module | Current Citadel behavior | Gaps found |
|---|---|---|
| Authentication | Login checks active status and password, issues a Sanctum token; logout revokes it; accounts are CLI-provisioned. Configured frontend API now owns login/session restoration. | No public invitations, activation, reset, or suspension workflow. Supabase-only mode has no verified Laravel employee crosswalk. |
| Employee management | Scoped reads, HR writes, staff ID uniqueness, account synchronization, and PCCM-only sensitive fields. | No dedicated profile self-service, employment history, designation catalog, or termination workflow. |
| Attendance | Own/team scoped records, transactional clock sessions, open-session and repeat-clock-out conflict protection, audit rows. | No shifts, late/early/overtime/break engine, correction approvals, import persistence, or payroll integration. |
| Leave | Submission and staged department-head/business-head/HR decisions with approval history and transactions. | Caller supplies days; no calendar/policy/overlap/balance ledger; balance read scope is inconsistent; no cancellation restoration. |
| Payroll | Effective-dated salary assignments, templates, bonuses, deductions, loans, provident-fund entries, draft generation and finalization. | No statutory rule versions/snapshots, review state, attendance/unpaid leave input, or confirmed uniqueness of period. Finalized runs are guarded from regeneration. |
| Projects/tasks | CRUD, status updates, comments, pagination, audit calls. | Project/task record-level authorization is missing; arbitrary assignments possible; Trellis bypasses these endpoints and its string IDs/fields do not match Laravel's integer model. |
| Documents | Type/size validation, private storage, download authorization, cleanup on database failure. | No general document self-service/payslip generation or lifecycle. |
| Notifications/audit | Target-checked read/mark-read; server audit log writes and privileged listing. | Domain-triggered notifications/reminders and scheduled jobs are absent. |
| Talent | Onboarding journey and recruitment requisition reads/tasks. | No full recruitment pipeline or background onboarding actions. |

## Existing cross-cutting controls

- API routes require Sanctum except health and login; login and mutations have rate limits.
- Form validation and Eloquent queries are used; raw user SQL is not present in the reviewed paths.
- Payroll generation/finalization and leave status decisions use DB transactions.
- Private documents are retrieved through an authorization check.
- Existing tests run against in-memory SQLite and baseline suite passed 32 tests / 132 assertions.

## NotchHR comparison boundary

Official NotchHR public materials describe payroll, employee records, attendance, leave, requisitions, recruitment, exit, announcements, tasks/time tracking, performance, learning, grievances, promotions, and documents. Its leave page documents balance/history visibility, employee applications, selected assignees, notifications, manager calendar views, and HR workflow setup. No authenticated behavior or API/database contract was verified. See [notchhr-product-analysis.md](notchhr-product-analysis.md).

## Findings requiring priority

1. Protect live Supabase tables/storage with a project-specific, table-specific access design after establishing the canonical project and replacing or constraining direct browser paths. The current broadly permissive policies are verified in the connected project.
2. Close Laravel leave-balance and task/project object-scope gaps immediately.
3. Do not connect Laravel to the live Supabase schema before schema/identity compatibility is demonstrated.
4. Build leave and attendance ledgers/calculation services before exposing balances or payroll effects.
5. Add effective-dated, immutable payroll rule snapshots before enabling statutory calculations.

## Implementation follow-up

Completed in this pass: project/task collection queries are role-scoped; object reads and mutations are checked against scoped queries; employees only see assigned tasks and can change those task statuses; managers can create/update/delete tasks only in their scope; assignment/project/member relationships are constrained to an entity; task comments produce audit entries. Leave-balance list and employee-specific routes now enforce employee, department, or entity scope and deny unscoped system-admin access. Regression tests cover employee assignment scope, cross-entity reads/assignment, and leave balances. Auth now separates Laravel and Supabase providers, removes user-selected signup roles, and restricts local persona auth to explicit development-only opt-in. A candidate Supabase migration and pgTAP file cover Auth registration/profile hardening but remain unapplied and unexecuted.

Still unresolved: active live Supabase broad policies, frontend browser-to-Supabase data paths, and live/Laravel schema mismatch. A narrow Auth/profile migration is present locally but was not applied; its pgTAP test could not connect because no local PostgreSQL/Supabase service is running. No live DB change was applied. Policy-dependent leave/attendance/payroll engines remain proposals until business rules are supplied.
