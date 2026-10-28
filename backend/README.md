# Citadel People Hub API

Laravel 13 REST API for the React application. Supabase is used only as PostgreSQL; Laravel owns authentication, authorization, business rules, REST APIs, validation, file access, and audit records.

## Requirements

- PHP 8.3+ with `pdo_pgsql`, `mbstring`, `openssl`, `fileinfo`, `tokenizer`, `xml`, `ctype`, and `json`
- Composer 2
- Supabase PostgreSQL connection details, including the database password from the Supabase project settings
- Private S3-compatible storage credentials for production document uploads
- Node.js and npm for the React frontend

## Connect to Supabase

1. If `backend/.env` does not exist, copy `.env.example` to `.env`. If it already exists, update its database variables without replacing `APP_KEY`.
2. The existing Supabase project URL identifies project `wphvutcehzqseybdfcxq`; the example configuration points at its PostgreSQL direct connection. Confirm that the Supabase project has the direct connection enabled and reachable from the PHP host. For IPv4-only hosts, use the project’s Supavisor session-pooler host and the exact username and port shown in Supabase **Connect** settings.
3. Get the database password from Supabase **Project Settings → Database** and enter it only in the ignored `backend/.env`. The Supabase anon/publishable key and service-role key are not PostgreSQL passwords and must not be used as `DB_PASSWORD`.
4. Before changing the database, inspect and back up the live `public` schema. The checked-in SQL describes `entities`, `departments`, `employees`, `leave_requests`, `attendance_records`, `audit_logs`, `documents`, and `notifications`, while Laravel expects different columns, types, and some different table names. The existing SQL also stores employee entity/department IDs as text, whereas Laravel expects UUID relations; the SQL has no Laravel `users` table. **Do not run Laravel migrations against the live Supabase project until its actual schema has been inspected and an explicit compatibility migration is reviewed.** The first and domain migrations fail before creating Laravel tables when overlapping domain tables exist; this safety guard does not reconcile the schemas or make them compatible.
5. `composer setup` deliberately does not run migrations. Do not use `migrate:fresh`, `migrate:refresh`, or the seeder against the existing Supabase project. Laravel's `users`, cache, queue, and token tables also need a reviewed provisioning plan.
6. Verify the connection without changing data:

   ```sh
   php artisan tinker --execute='dump(DB::connection()->getPdo() !== null, DB::connection()->getDatabaseName());'
   ```

   This performs a read-only connection check. Do not run `migrate`, `migrate:fresh`, or the seeder until the existing schema compatibility work is complete and the target has a verified backup.

7. Set the frontend API URL in the repository root `.env`:

   ```dotenv
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

   Laravel repositories are used when this URL is set. Production builds fail closed if it is missing; local development uses in-memory/mock repositories when it is unset. The browser no longer connects to Supabase. Public account registration is disabled; `people-hub:create-admin` prompts for credentials only after a reviewed schema plan has been applied.

Health check: `GET http://127.0.0.1:8000/api/v1/health`.

## API overview

All application data endpoints require `Authorization: Bearer <token>`. `POST /api/v1/auth/login` is rate-limited; `POST /api/v1/auth/logout` revokes the current token. Tokens expire after 60 minutes by default (`SANCTUM_EXPIRATION`).

- `GET /entities`, `GET|POST /departments`, `PATCH /departments/{id}`
- `GET|POST /employees`, `GET|PATCH|DELETE /employees/{id}`
- `GET|POST /leave-requests`, `GET /employees/{id}/leave-requests`, `PATCH /leave-requests/{id}/status`
- `GET /attendance`, `GET /attendance/today-summary`, `POST /attendance/clock-in`, `POST /attendance/{id}/clock-out`
- `GET|POST /documents`, `GET /documents/{id}/download`
- `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`
- `GET /audit-logs`, `GET /onboarding-journeys`, `PATCH /onboarding-journeys/{id}/tasks/{taskId}`, `GET /requisitions`

Audit rows are created by Laravel domain actions; clients cannot submit arbitrary audit rows or claim a severity. The API enforces entity/department/self scopes and does not return encrypted employee financial or personal fields outside PCCM Super Admin access. Documents are stored privately and served only after authorization. Production startup requires private S3 storage configuration; local development uses the private local disk. Additional accounts are provisioned by a trusted operator with `php artisan people-hub:create-user`; scoped roles must be linked to a staff ID already in the employee table.

Leave approvals are staged in order: department head, business head, then PCCM/HR. Attendance supports multiple clock-in/clock-out sessions per employee per day while preventing more than one open session.

The API-backed modules are employees, organization, leave, attendance, documents, notifications, audit, and onboarding/requisition reads. Offboarding, performance, AI governance, Microsoft 365/device connectivity, payroll, payments, email delivery/recovery, background-job workflows, and some reports/policy content are not implemented as Laravel integrations. The UI labels unimplemented integrations as unavailable instead of simulating a successful connection.

## Production deployment checklist

- Set `APP_ENV=production`, `APP_DEBUG=false`, HTTPS `APP_URL` and frontend origins, a strong generated `APP_KEY`, Supabase PostgreSQL credentials with SSL required, and `SANCTUM_EXPIRATION`.
- Serve both frontend and API over HTTPS. Keep `.env` and credentials outside source control; never expose a database password or Laravel key to Vite.
- Use a least-privilege server-side database role, managed Supabase backups and restore tests, monitoring, log retention, and an operational incident process. Never use the Supabase anon/publishable key or a service-role API key as a database credential.
- Configure `FILESYSTEM_DISK=s3`, a private bucket, and its credentials/workload identity before production startup. Verify bucket public access is blocked, encryption and retention are configured, and restore/access tests pass. Storage failures are surfaced rather than silently ignored.
- The migration at `supabase/migrations/20261024_000001_remove_public_full_access_policies.sql` removes the eight known permissive browser policies without changing rows. Review the live Supabase policy inventory, back up the project, and verify Laravel's database-role access before applying it. The live schema was not reachable from this workspace; do not assume these are the only policies present.
- Production email, password recovery, invitations, payment processing, and third-party integrations are not implemented. Do not advertise or enable those workflows until the Laravel-owned services, credentials, callbacks, and tests exist. The default mailer is not a delivery provider.
- Run `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache` for a reviewed deployment. Run migrations only after the schema compatibility plan, backup, and target have been verified; do not run `migrate:fresh` or the seeder against production.
- The queue connection defaults to `sync`; there are no domain job classes or worker-managed workflows yet. If jobs are added, configure a durable queue backend and run a supervised worker with bounded retries/timeouts.
- The front end keeps bearer tokens in memory, so a page refresh requires signing in again. A same-site Sanctum cookie/BFF deployment can be adopted if the hosting topology supports it.

## Verification

Run `php artisan test` from `backend/`. Tests use an in-memory SQLite database and do not connect to or certify compatibility with the live Supabase PostgreSQL schema. Validate transaction locking and migration behavior against a non-production PostgreSQL clone before rollout.
