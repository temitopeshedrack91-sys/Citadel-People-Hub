# Database architecture and compatibility notes

**Date:** 2026-10-30. This describes source migrations and read-only live metadata. No live data was queried or changed.

## Laravel model

| Domain | Tables / relationships | Important constraints and behavior |
|---|---|---|
| Organization | `entities` → `departments` → `employees`; user maps to employee by `staff_id` | Entity/dept scope underpins current role checks. Employee staff IDs are unique. |
| Auth | `users` → `personal_access_tokens` | Password hashes and Sanctum tokens; users are provisioned through CLI. |
| Employment | `employees` with manager reference; salary assignments, loans, deductions, provident funds, tasks, projects | Sensitive employee fields are role-filtered in API response. No employment-history table. |
| Attendance | `attendance_records` belongs to employee | Date plus clock timestamps; multiple sessions/day supported. No shift, break, exception, import, or correction ledger. |
| Leave | `leave_requests` belongs to employee; `leave_categories` → `leave_policies`; `employee_leave_balances` belongs to employee/category | Requests include approval stage/history. Balances have no transaction ledger, accrual event, or unique idempotency key verified in application code. |
| Payroll | `salary_templates` → `employee_salary_templates`; `payroll_runs` → `payroll_items` → `payroll_item_deductions`; bonuses, deductions, loans/installments, provident funds/transactions | Assignments have effective dates; calculation results persist in items. Rule versions/snapshots are absent. |
| Projects/tasks | `projects` → `tasks` → `task_comments`; project members through pivot; task optionally references project/department and assigned/creator employee | Laravel integer IDs. Existing schema does not itself encode tenant-safe authorization. |
| Supporting | `documents`, `audit_logs`, `notifications`, `onboarding_journeys`, `recruitment_requisitions` | Storage paths and role/target checks are application-managed. |

Laravel migrations include foreign keys and indexes for major relationships. One migration refuses to continue when it detects certain pre-existing People Hub tables because the legacy layout is incompatible.

## Connected Supabase project: read-only metadata findings

- Current frontend-configured and connected project: `Citadel` (`czbwedtrnzlfpdbzlnim`). `backend/.env.example` points to a different project, and the ignored local Laravel environment uses a shared pooler hostname that does not identify the project by hostname alone. Confirm the deployed Laravel database target before rollout.
- Applied migration versions inspected: `20261024` through `20261029`.
- The public schema contains legacy and Laravel-like structures. Live `tasks.id` is text while Laravel migrations/controllers expect numeric IDs; identity links differ. This prevents treating the Laravel model as a drop-in schema contract.
- Fourteen public tables have unconditional CRUD policies addressed to `public`; `anon` and `authenticated` have broad privileges on all 19 inspected public tables. `storage.objects` has unconditional CRUD policies and all three buckets are public. Five RLS-enabled tables have no policies and appear in the advisor report.
- Only aggregate identity-match counts and role frequencies were read; raw names/emails, sensitive HR fields, and Storage objects were not returned. No live schema/policy change was made. During earlier environment inspection, a direct database URI from an ignored local file appeared in tool output. Treat its password as exposed and rotate it; the value is intentionally not repeated.

See [supabase-security-identity-reconciliation.md](supabase-security-identity-reconciliation.md) for the Auth/Laravel identity comparison, direct frontend operations, staged policy design, and test limits.

## Missing domain structures for requested workflows

| Capability | Structures needed after requirements are validated |
|---|---|
| Shift/attendance | Versioned shifts, assignments, break rules, exceptions, correction requests, import batches and source rows, reconciliation decisions |
| Leave | Leave balance transaction ledger with unique event key, policy version/effective dates, holiday calendar, approval events |
| Payroll | Versioned statutory/org rules, run input snapshot, adjustment records, review/approval events, generated payslip artifact metadata |
| Employment/self-service | Employment history, invitation/activation/reset tokens, permitted profile-change requests |
| Task history | Status/assignment/comment events, attachments, explicit tenant ownership |

## Safe migration and tenant guidance

Do not apply Laravel migrations to the live connected Supabase project until the Laravel database target is confirmed and a schema compatibility plan is reviewed against an isolated PostgreSQL snapshot. Keep additive schema changes reversible. Use a stable organization/entity foreign key on tenant-owned records, composite constraints where they encode scope, and unique idempotency keys on import/ledger events. For Supabase, pair least-privilege grants with explicit table-specific policies that map authenticated identities to the approved tenant/employee relation; `USING (true)` and `WITH CHECK (true)` do not provide tenant isolation.
