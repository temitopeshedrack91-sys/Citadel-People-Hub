# Testing and quality report

**Date:** 2026-10-30

## Automated verification

| Check | Result | Scope / notes |
|---|---|---|
| Focused Laravel API tests | **Passed, 23 tests / 93 assertions** | `ProjectsAndTasksApiTest` and `PeopleHubApiTest` |
| Full Laravel suite | **Passed, 36 tests / 164 assertions** | Uses `backend/phpunit.xml`, SQLite in-memory DB. Includes migration compatibility guards, auth, HR endpoints, payroll, attendance, documents, and the new scope regressions. |
| Laravel Pint | **Passed** | `vendor/bin/pint --dirty --format agent` |
| Frontend typecheck/lint | **Passed** | `npm run lint` (`tsc --noEmit`) |
| Frontend automated tests | **Passed, 109 tests / 17 files** | `npm test`; includes local persona-auth gating and Supabase role-source/signup regressions |
| Frontend production build | **Passed** | `npm run build`; Vite emitted an existing CSS optimization warning for `@charset` in Bootstrap CSS. |
| Composer security audit | **Passed, no advisories** | After Symfony/Mime 8.1.10 and polyfill-mbstring 1.43.3 update. |

## New regression coverage

- Employee task list contains only tasks assigned to that employee.
- Employee cannot read another task or edit their assigned task's administrative fields; can update progress/status on their own assigned task.
- Department head cannot read a task or project in another entity and cannot assign a task across entity boundaries.
- Employee leave-balance endpoint returns only their own balance and rejects another employee's balance.
- Department-head leave-balance list is department-scoped.
- System admin without an entity scope receives no balances.
- System admin project/task lists are restricted to its entity; an account without an entity receives no records.
- Supabase Auth profile role is preferred over editable `user_metadata.role`; missing profiles default to `EMPLOYEE`.
- Supabase signup calls standard Auth with only a full name and does not call the role-selecting RPC.
- Local persona authentication is unavailable in production, with Laravel configured, or without explicit development opt-in.

## Database and integration boundaries

- Feature tests run against isolated SQLite in-memory databases; they do not exercise the connected Supabase PostgreSQL schema.
- Existing tests include guards ensuring Laravel migrations stop when incompatible People Hub tables are detected. No production migration was run.
- Live Supabase inspection covered schema/policy inventories, applied migration versions, function definitions, security advisor findings, and aggregate-only identity matches. No raw names/emails, sensitive HR fields, or storage objects were returned; no production write occurred.
- The Supabase security/identity review is documented separately. RLS behavior was **not** test-passed: branch creation is unavailable on the current Supabase plan, and no local PostgreSQL service is running. No production policy/grant was changed. The synthetic-user matrix remains a required staging test.
- `supabase test db` was attempted after adding `supabase/tests/auth_registration_profiles_test.sql`; it could not connect to local Postgres on `127.0.0.1:54322`. The 10 pgTAP checks are authored but **not executed**. The candidate migration remains unapplied.
- NotchHR authenticated flows could not be tested because no authorized demo access was available.
- No browser/E2E test runner is installed; the frontend was type-checked and production-built only.

## Remaining verification before production

1. Confirm the deployed Laravel database target and provide an isolated Supabase staging project or a local PostgreSQL runtime that can be started outside this sandbox.
2. Reconcile the Supabase Auth UUID, Laravel user ID, and employee/staff ID without auto-linking on email alone.
3. Review and run table-specific RLS and Storage policies against synthetic identities; verify anon/authenticated access and application regression flows before production.
4. Rotate the local database password that appeared in tool output and update active clients.
5. Run browser smoke tests for Laravel auth and Trellis after adapting the API client and ID contract.
6. Add policy-owner acceptance tests for leave counting/accrual, shift/overtime rules, and payroll rule versions before implementing those calculations.
