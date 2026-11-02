# Existing System Audit

**Audit date:** 2026-10-30
**Scope:** Source-level audit plus read-only inspection of the connected Supabase project's schema inventory, migration history, RLS policies, security advisor findings, and aggregate-only identity matching. No raw personal or payroll data was returned and no live write or migration was attempted.

## Executive summary

Citadel People Hub is a React 19/Vite/TypeScript single-page application with a Laravel 13 REST API and a Supabase/PostgreSQL data store. The repository contains three overlapping data paths: Laravel repositories, browser-side Supabase repositories and a local-storage mock repository. At audit start, the checked-in README said Laravel owned authentication and business operations, while the source preferred Supabase sign-in and let Trellis access Supabase directly. The implementation follow-up now makes Laravel the auth authority whenever its API is configured; the direct Trellis and Supabase data paths remain a high-risk inconsistency.

The Laravel API already implements employee records, attendance clock sessions, staged leave approvals, secure document downloads, notifications, audit logging, payroll, projects and tasks. It uses Sanctum bearer tokens, role and record scoping in several controllers, database transactions for sensitive changes, and test-only in-memory SQLite. Material gaps remain: leave balances are not scoped consistently; project/task endpoints lack record-level authorization; the active Trellis UI bypasses those Laravel endpoints; attendance imports, shifts and correction approvals are not implemented server-side; leave balances and policy effects are not maintained as transactions; payroll does not consume attendance or leave and lacks effective-dated statutory rule versions; invitation/reset/email/background workflows are absent.

## Architecture map

### Frontend

- `src/App.tsx` composes the SPA and view modules.
- `src/components/views/` contains dashboard, employee, leave, attendance, payroll, recruitment, onboarding, offboarding, projects, reporting, notifications and settings views. `src/components/trellis/` contains the Trellis task UI.
- `src/context/AuthContext.tsx` owns the displayed user and sign-in state. `src/utils/rbac.ts` controls navigation and client-side role checks; these checks are not a replacement for API authorization.
- `src/services/dataService.ts` selects Laravel repositories when `VITE_API_BASE_URL` is set and Supabase repositories otherwise. `src/services/mockRepository.ts` also implements the same repository interfaces, but is not the selected fallback in `dataService.ts`.
- `src/services/laravelAdapter.ts` maps the API modules to the frontend data contracts. `src/services/supabaseAdapter.ts` is a direct browser-to-Supabase path. `src/services/laravelClient.ts` stores the bearer token in browser local storage and sends it to `/api/v1`.
- `src/components/trellis/TrellisContext.tsx` calls `taskDbService` in `src/services/supabaseService.ts` directly for task fetch, write and realtime updates. The Laravel `/projects` and `/tasks` API is not wired into that board.
- `src/features/attendance-import/` has a CSV/TSV/Excel-oriented biometric parsing and matching workflow with explicit format assumptions. It is frontend-side and does not persist reconciled imports through the Laravel API.

### Backend

- `backend/` is a Laravel 13 API running on PHP 8.5. `backend/routes/api.php` defines versioned `/api/v1` routes, bearer-token auth via Sanctum, request throttles, and the domain controller map.
- Controllers are in `backend/app/Http/Controllers/Api/`. Business logic is mostly controller-local, with payroll calculations in `backend/app/Services/PayrollService.php` and audit creation in `backend/app/Support/AuditLogger.php`.
- Eloquent models and relationships are in `backend/app/Models/`. Trusted account provisioning is via `people-hub:create-user` and `people-hub:create-admin` CLI commands. There is no public registration route.
- `backend/database/migrations/` defines Laravel users/tokens and People Hub, payroll, projects/tasks and leave-policy tables. Local feature tests set SQLite `:memory:` in `backend/phpunit.xml`.
- File uploads use Laravel Storage and private paths. The README calls for private S3-compatible storage in production; local development uses the private local disk.
- `backend/routes/console.php` has only Laravel's sample `inspire` command. No domain scheduler, durable business job, email delivery, invitation or notification automation was found.

### Main entities and relationships

- Organization: `entities` has many `departments`; employees and users carry entity and department scope.
- Identity: `users` has Sanctum `personal_access_tokens`; `users.staff_id` links an application account to `employees.staff_id`.
- Employment: `employees` belongs to an entity and department, can reference a manager employee, and has salary assignment, payroll item, loan, deduction, provident fund, task and project relationships.
- Attendance: `attendance_records` belongs to an employee; records carry a date and clock-in/out timestamps. Multiple closed sessions per day are supported in code.
- Leave: `leave_requests` belongs to an employee and stores the approval stage/history as request data. `leave_categories`, `leave_policies`, and `employee_leave_balances` exist, but balance transactions are not modeled.
- Payroll: salary templates are assigned to employees over effective dates. Payroll runs have payroll items; items have deduction details. Loans have installments, and provident-fund movements are recorded as transactions.
- Work: projects belong to departments and have employee members; tasks belong optionally to a project/department and can be assigned to an employee; comments belong to a task and employee.
- Supporting tables: audit logs, managed documents, notifications, onboarding journeys and recruitment requisitions.

## Existing behavior by module

| Area | Source-level behavior | Audit status |
|---|---|---|
| Authentication | Login validates credentials and active status, issues Sanctum tokens; logout deletes the current token. Accounts are provisioned by CLI. Password reset, invitations, activation email and suspension workflow are absent. | Implemented, incomplete |
| Authorization | Frontend RBAC has four canonical roles and several aliases. Laravel scopes employees, leave, attendance, payslips and documents in selected controllers. Role names differ across layers, and authorization is not consistently centralized. | Implemented, inconsistent |
| Employees | HR role can create/update/deactivate records; staff IDs are unique; department/entity consistency is validated; user accounts are synchronized/deactivated; sensitive address, identity, bank and pension fields are returned only to PCCM Super Admin. Employee list/show uses role-specific query scope. | Implemented, incomplete |
| Attendance | Authenticated users can view scoped records and summaries; employees can open and close their own sessions; duplicate open sessions and repeat clock-out are rejected; clock-in/out writes audit rows. The implementation does not calculate shifts, late arrival, overtime, breaks or payroll effects. | Implemented, incomplete |
| Attendance import | Frontend parsing supports delimited exports, configurable matching assumptions, ambiguous/unmatched records and daily summaries. No Laravel import, idempotency key, reconciliation approval or audit trail was found. | Frontend-only |
| Leave | Employee/PCCM can submit; reviewer stages are department head, business head and HR; stage actions are transactional and append approval history. `totalDays` is client-supplied. Overlap rules, policy-based validation, balance reservations/deductions/restoration and public holiday calculation are missing. | Implemented, incomplete |
| Payroll | Templates and effective-dated employee assignments exist; drafts calculate basic salary, recurring allowances, bonuses, deductions, configurable percentages, loans and provident-fund contributions; payroll generation/finalization use transactions; processed runs cannot be regenerated. There is no attendance/leave synchronization, statutory rule versioning, review/approval state, immutable rule snapshot, or confirmed unique period constraint. | Implemented, incomplete |
| Projects/tasks | Laravel CRUD, task status, comments, pagination and audit writes exist. Controllers do not scope read/update/delete by project membership, assigned employee, department, entity or owner. Trellis currently uses Supabase directly instead of this API. | Implemented, unsafe/incomplete |
| Self-service | Backend supports own attendance, leave submission/history, payslip and loan reads, own task status is not safely enforced, and profile editing is local-storage-only. No employee-owned profile API, announcements endpoint or payslip file download exists. | Incomplete |
| Documents | PCCM upload with type/size limits; private Storage path; download checks access and stored file existence; failed DB insert removes the file. Entity/department/document level checks are implemented. | Implemented |
| Notifications/audit | Notifications can be listed and marked read with target checks. Audit log rows are server-generated, and read is restricted to PCCM/system admin. No automated domain notification creation or reminder pipeline found. | Implemented, automation missing |
| Background work/integrations | Queue configuration exists but no domain jobs/scheduling were found. Microsoft 365/device integration, email, payment processing and several reports are explicitly described as unavailable in `backend/README.md`. | Missing/unverified |

## Database and migration notes

- Laravel migrations create the API's relational model and include foreign keys/indexes for key relationships. The domain migration intentionally stops if several existing People Hub tables are detected, as a guard against applying incompatible schemas.
- `supabase/schema.sql` and earlier Supabase migrations describe an older browser-facing schema with different columns/types. `backend/README.md` warns that these definitions do not match Laravel's expected schema and says not to run Laravel migrations against the live Supabase project before a reviewed compatibility plan and backup.
- **Live schema, grants, policies and advisor findings were inspected read-only** in connected project `Citadel` (`czbwedtrnzlfpdbzlnim`). The frontend configuration matches this project. `backend/.env.example` still points to a different project; the ignored local Laravel environment uses a shared pooler hostname that does not identify its project by hostname alone. Confirm the deployed Laravel database target before identity reconciliation. Applied migrations include versions `20261024` through `20261029`. Live public tables include both legacy and Laravel-like records. Notably, live `tasks` uses a text identifier while Laravel expects an integer identifier; identity relationships also differ.
- Fourteen public tables have unconditional `USING (true)` / `WITH CHECK (true)` policies for all CRUD commands and the `public` role. `anon` and `authenticated` also hold broad table privileges on all 19 inspected public tables. `storage.objects` has the same four open policies; `avatars`, `citadel`, and `documents` buckets are public. These are verified production security exposures, not only risks in an unapplied migration.
- Five RLS-enabled tables have no policies: `onboarding_journeys`, `organizations`, `personal_access_tokens`, `recruitment_requisitions`, and `users`. The security advisor also flags three publicly executable `SECURITY DEFINER` functions (`handle_new_user`, `register_user`, and `rls_auto_enable`), mutable search paths on two functions, and disabled leaked-password protection. `register_user` accepts a caller-supplied role and creates a confirmed Supabase Auth user. The live database was not changed.
- The checked-in `20261029_000001_complete_supabase_sync.sql` itself creates broad policies, public document buckets, and a `SECURITY DEFINER` trigger that copies a role from user-editable metadata. Do not apply it as written.
- No shift, attendance-import, attendance-correction, leave-transaction, payroll-rule-version, announcement, employment-history or offboarding table is present in the Laravel migrations.

## Security and reliability findings

1. **Supabase/Laravel authority mismatch (partly remediated):** At baseline, `AuthContext` signed into Supabase first and trusted user metadata for the displayed role. The implementation now uses Laravel exclusively when its API is configured and reads the Supabase profile role in Supabase-only mode. Trellis still uses direct Supabase CRUD/realtime, so the data-plane mismatch remains.
2. **Live Supabase exposure (verified):** The frontend's configured project is Citadel (`czbwedtrnzlfpdbzlnim`), and direct browser access remains in the app. Table grants, permissive policies, Storage configuration, and the public role-registration function expose sensitive operations. The Laravel environment template points elsewhere, and the deployed Laravel database target is not verified. Remediation requires confirming that target, mapping authenticated identities and intended roles to each table, and applying reviewed, table-specific policies; blanket policy removal before replacing the browser data path could break the app. No live change was made.
3. **Leave-balance IDOR:** `GET /leave/balances` can return every employee balance for a non-employee role, and `/employees/{employeeId}/leave-balances` does not run the controller's employee-scope check.
4. **Task/project IDOR:** Laravel task and project `show`, `update`, `destroy`, comment, and collection operations have no server-side record-scope policy. Authenticated users can query or mutate records outside their employee/entity/department scope.
5. **Attendance integrity:** Clock-in accepts client identity fields but rechecks employee/staff identity and uses the authenticated user's staff ID. There is no shift-based computation or device import/reconciliation path.
6. **Leave/payroll integrity:** Client-supplied leave days are trusted; overlaps and balances are not validated or transacted. Payroll uses configurable percentages but does not snapshot a versioned statutory rule set and does not account for attendance or unpaid leave.
7. **Asynchronous operations:** Queue infrastructure exists, but no domain jobs, scheduled accrual/reconciliation or reminder workflows exist.

## Verification performed

- Inspected the actual frontend, Laravel routes/controllers/models/migrations, Supabase SQL, project tests and README. No Supabase application rows were queried.
- Read-only Supabase metadata inspection confirmed the connected project ID, migration history, selected table/type mismatches, grants, permissive policies, storage settings, and security-advisor findings. During later environment inspection, a direct database URI from an ignored local file appeared in tool output. Treat its password as exposed and rotate it; the value is not repeated here. No live data or schema was changed.
- Enumerated Laravel API routes: 64 routes, including employee, leave, attendance, payroll, projects/tasks, documents, notifications, audit and onboarding/requisition reads.
- Ran the existing Laravel suite against the configured in-memory SQLite test database before implementation: **32 tests passed, 132 assertions**.
- No Supabase schema, policy, storage, or application data was changed. Local SQLite application data was not opened or changed; test runs use the in-memory SQLite database.

## Constraints for the next phases

- Keep Laravel as the business-authorization authority described by the backend README, but reconcile its deployed database target, the live Supabase schema, and the identity model before directing production traffic to it. Avoid live Supabase schema/policy edits until the intended access model, compatibility plan, and recoverable backup are confirmed. See [supabase-security-identity-reconciliation.md](supabase-security-identity-reconciliation.md).
- Public NotchHR web pages can document advertised capabilities, but no workflow is verified unless a legitimately accessible demo/application is provided.
- Preserve the existing React interface and API contracts where practical. Add tests for authorization and data-scope changes, and report SQLite-only verification separately from PostgreSQL production compatibility.

## Implementation status after this audit

The audit findings for leave-balance access and project/task record scope were corrected in the implementation pass. The Laravel project/task endpoints now scope list and object queries, constrain assignments and membership, and audit task comments. Leave balances now enforce role and employee scope. The frontend now uses Sanctum login and `/auth/user` session restoration when the Laravel API is configured, removes public role selection from Supabase signup, and derives Supabase-only roles from the current user's profile. Local demo personas require an explicit development-only flag. A candidate migration and pgTAP test now cover Auth registration and profiles. The connected Supabase policies/storage settings and direct Trellis data path remain unresolved; the candidate database migration was not applied or tested against PostgreSQL. See [implementation-report.md](implementation-report.md) and [testing-report.md](testing-report.md).
