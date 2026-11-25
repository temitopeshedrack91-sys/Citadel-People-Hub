# Citadel People Hub

**Stack:** React 19 + TypeScript + Vite (Frontend), PHP 8.2+ / Laravel 13 + Sanctum (JSON API Backend), and MySQL 8+/9+ (Relational Database, with PostgreSQL support via `pdo_pgsql`).

Citadel People Hub is an end-to-end HR, organizational hierarchy, and two-stage leave management platform supporting multiple corporate entities, real-time server-sent event updates, attendance, payroll, performance, offboarding, and governance audit logs.

---

## Architecture Notes

### Backend Layer Separation (`backend/`)

```text
routes/api.php                  -> Versioned JSON API routes (/api/v1/*) & Sanctum auth middleware
app/Http/Controllers/Api/*      -> Request validation, HTTP response formatting, controller orchestration
app/Support/RoleAuthorization.php -> Centralized server-side RBAC & hierarchy scope filters
app/Services/*                  -> Domain business rules:
                                   - EmployeeHierarchyService (cycle detection, upward/downward tree traversal)
                                   - LeaveWorkflowService (2-stage state machine, date/overlap/balance rules)
                                   - RealtimeEventService (publishes DB change events for SSE/poll clients)
app/Repositories/*              -> Relational query encapsulation:
                                   - OrganizationRepository, EmployeeRepository, LeaveRepository
app/Models/*                    -> Eloquent models & relationships
bootstrap/app.php               -> Unified JSON error rendering (401, 403, 404, 422, 500)
```

### Phase Dependencies (Phase 1 -> Phase 2)

- **Phase 1 (Foundation):** Stores organizational entities (`entities`), entity-coupled departments (`departments.entity_id`), and self-referencing reporting hierarchy (`employees.manager_id`). `EmployeeHierarchyService` walks the parent chain on every create/update to block self-supervision and multi-hop circular reporting lines (`422`), while `OrganizationRepository` enforces that `department_id` belongs to `entity_id` (`422`).
- **Phase 2 (Core Workflows):** `LeaveWorkflowService` and `RoleAuthorization` consume the live `employees.manager_id` graph directly rather than duplicating manager relationships:
  1. Submitting a leave request routes to **Stage 1 (`MANAGER`)** using the employee's direct supervisor in `employees.manager_id`.
  2. When HR reassigns an employee's manager in Phase 1, open Stage 1 leave requests automatically re-target to the new direct supervisor.
  3. Only the assigned direct supervisor (never self, unrelated managers, or standard employees) can act at Stage 1, advancing the request to **Stage 2 (`HR`)**.
  4. Only global HR / Admin users can act at Stage 2, advancing to **`COMPLETE`** (`Approved`) and deducting from `employee_leave_balances`.
  5. Rejection at either stage sets `status = Rejected` and preserves `stopped_at_stage` (`MANAGER` or `HR`), along with `manager_actor_id/at` and `hr_actor_id/at`.
  6. Every endpoint checks `RoleAuthorization` server-side so line managers and employees receive `403 Forbidden` if calling HR-only endpoints directly.

### Real-Time Synchronization

Mutations publish rows to `realtime_events`. The frontend (`src/services/realtimeSync.ts` and `src/hooks/useRealtimeTable.ts`) connects to `GET /api/v1/realtime/stream` via `EventSource` (SSE with `Last-Event-ID` resume), supplemented by `BroadcastChannel` for same-origin tabs and a lightweight `GET /api/v1/realtime/events` fallback poll when SSE is unavailable.

---

## Requirements

- **PHP:** 8.2+ (tested on 8.5) with `pdo_mysql` (or `pdo_pgsql`) and `pdo_sqlite` extensions
- **Composer:** 2.x
- **Node.js:** 20.x+ & npm
- **Database:** MySQL 8.0+ / 9.x (or PostgreSQL 14+)

---

## Setup & Installation

### 1. Database & Backend Setup

Create two MySQL databases (`citadel_people_hub` for development and `citadel_people_hub_test` if running PHPUnit against MySQL):

```sql
CREATE DATABASE IF NOT EXISTS citadel_people_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS citadel_people_hub_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Install PHP dependencies, configure `backend/.env`, run migrations, and load seed data:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
```

Key `backend/.env` variables:

| Variable | Description | Configured Value / Example |
|---|---|---|
| `APP_URL` | Base backend URL | `http://localhost:8088` |
| `DB_CONNECTION` | Relational driver (`mysql` or `pgsql`) | `mysql` |
| `DB_HOST` | Database host | `127.0.0.1` |
| `DB_PORT` | Database port (`3306` MySQL / `5432` Postgres) | `3306` |
| `DB_DATABASE` | Application database name | `citadel_people_hub` |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials | `root` / `` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `PHP_CLI_SERVER_WORKERS` | Parallel PHP dev workers for SSE + API | `4` |

*(To use PostgreSQL instead of MySQL, set `DB_CONNECTION=pgsql`, `DB_PORT=5432`, and provide your PostgreSQL database/user in `backend/.env`.)*

### 2. Frontend Setup

From the repository root:

```bash
npm install
cp .env.example .env
```

Key `.env` variables:

| Variable | Description | Configured Value |
|---|---|---|
| `VITE_API_BASE_URL` | Base Laravel server URL | `http://localhost:8088` |
| `VITE_ENABLE_LOCAL_DEMO_AUTH` | Enables quick demo login buttons on sign-in card | `true` (set `false` in production) |

### 3. Start Both Servers

Terminal 1 (Backend — `--no-reload` enables multi-worker `PHP_CLI_SERVER_WORKERS=4` so SSE streaming does not block concurrent API requests):

```bash
cd backend
PHP_CLI_SERVER_WORKERS=4 php artisan serve --no-reload --host=localhost --port=8088
```

Terminal 2 (Frontend):

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Seeded Test Accounts

All seeded accounts use password: `Password123!`

| Role | Name | Staff ID | Email | Scope & Hierarchy |
|---|---|---|---|---|
| `PCCM_SUPER_ADMIN` | Dr. Bukola Adeleke | `CGCC-001` | `dr.adeleke@citadel.ng` | Full HR & Admin oversight across all entities |
| `HR_STAFF` | Sussan Afuwape | `CGCC-007` | `s.afuwape@thecitadelglobal.org` | HR Manager — Stage 2 approvals, all employees, reports |
| `MANAGER` | Pastor Tunde Bakare | `CGCC-000` | `pastor.bakare@citadel.ng` | Executive Lead — supervises `CGCC-002` & `CSOG-001` |
| `MANAGER` | Engr. Femi Olatunji | `CGCC-002` | `femi.olatunji@citadel.ng` | Head of Technology — Stage 1 approvals for `CGCC-003`, `CGCC-004` |
| `EMPLOYEE` (Supervisor) | Nadia Safitri | `CGCC-003` | `nadia@citadel.ng` | Lead Product Designer — dynamically elevated supervisor for `CGCC-005` |
| `EMPLOYEE` | Bayu Wirawan | `CGCC-004` | `bayu@citadel.ng` | Standard employee — reports to `Engr. Femi Olatunji` |
| `EMPLOYEE` | Jonathan Tan | `CGCC-005` | `jonathan@citadel.ng` | Standard employee — reports to `Nadia Safitri` |
| `AUDITOR` | Grace Okafor | `CGCC-006` | `grace.okafor@citadel.ng` | Read-only viewer across directory |

Seeded entities & departments include **Citadel Global Community Church (`CGCC`)** (Finance, PCCM, Facilities, Security, S.O.'s Office, Protocol, ICT, Transport & Logistics), **Citadel School of Government (`CSOG`)** (Academy & Programmes, Admin & Operations), and **Citadel Holdings (`Holdings`)** (Bookshop, Cafe, Workstation, Asabi Aladire, Sales & Business Development).

---

## Key API Surface (`/api/v1`)

Authenticated routes require `Authorization: Bearer <token>` and return consistent JSON errors: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity` (`message` + `errors`), and `500 Server Error`.

### Authentication & Realtime
- `GET /api/v1/health` — Public health check
- `POST /api/v1/auth/login` — Authenticate and issue Sanctum bearer token
- `GET /api/v1/auth/user` — Return current user, `effectiveRole`, `isSupervisor`, and direct report count
- `PATCH /api/v1/auth/profile` — Update contact phone & location
- `POST /api/v1/auth/logout` — Revoke bearer token
- `GET /api/v1/realtime/stream` — Server-Sent Events stream (`?token=...` or Bearer header, supports `Last-Event-ID`)
- `GET /api/v1/realtime/events` — Incremental event polling feed (`?since=<id>`)

### Phase 1: Organization, Directory & Hierarchy
- `GET /api/v1/entities` / `POST /api/v1/entities` — List/create entities (`POST` HR/Admin only)
- `GET /api/v1/departments` (`?entity_id=`) / `POST /api/v1/departments` / `PATCH /api/v1/departments/{id}` — Coupled entity/department master data
- `GET /api/v1/employees` — Role-scoped employee directory (`HR/Admin`: all; `Manager`: self + subtree; `Employee`: self + reporting context)
- `POST /api/v1/employees` / `PUT|PATCH /api/v1/employees/{id}` / `DELETE /api/v1/employees/{id}` — Employee CRUD (HR/Admin only; validates entity-department coupling & acyclic reporting lines)
- `GET /api/v1/employees/{id}/hierarchy` — Upward supervisor chain and downward direct reports subtree

### Phase 2: Two-Stage Leave Workflow & Role-Scoped Dashboards
- `GET /api/v1/dashboard/summary` — Role-scoped metrics (`HR` global metrics, `MANAGER` team stats/calendar/approvals, `EMPLOYEE` personal balance & history)
- `GET /api/v1/leave-requests` / `GET /api/v1/employees/{id}/leave-requests` — Role-scoped leave list
- `POST /api/v1/leave-requests` — Submit leave (validates date ordering, overlaps, and remaining balance)
- `PATCH /api/v1/leave-requests/{id}/status` — Two-stage transitions (`MANAGER` -> `HR` -> `COMPLETE`, or `Rejected` with `stoppedAtStage`, actor, and timestamp)
- `GET /api/v1/leave/team-calendar` — Team leave schedule scoped by reporting authority
- `GET /api/v1/leave/categories` / `GET /api/v1/leave/balances` / `POST /api/v1/leave/entitlements` — Categories, balances, and HR entitlement grants

### Additional HR Modules & Reporting
- `GET /api/v1/reports/workforce`, `/reports/leave-utilization`, `/reports/attendance-summary`, `/reports/recruitment-summary` — HR/Admin only (`403` for Managers and Employees)
- `/api/v1/attendance/*`, `/api/v1/payroll/*`, `/api/v1/offboarding/*`, `/api/v1/performance/*`, `/api/v1/documents/*`, `/api/v1/timesheets/*`, `/api/v1/audit-logs`, `/api/v1/notifications/*`

---

## Running Tests & Quality Checks

```bash
# Backend PHPUnit tests (SQLite in-memory via phpunit.xml)
cd backend && php artisan test

# Backend PHPUnit tests against real MySQL test database
cd backend && DB_CONNECTION=mysql DB_HOST=127.0.0.1 DB_PORT=3306 DB_DATABASE=citadel_people_hub_test DB_USERNAME=root DB_PASSWORD="" php artisan test

# Frontend TypeScript check, Vitest unit/component suite, and production build
npm run lint && npx vitest run && npm run build
```

---

## Feature Verification Walkthrough

1. **Hierarchy Cycle Prevention & Tree Traversal (Phase 1):**
   - Sign in as **Dr. Bukola Adeleke** (`dr.adeleke@citadel.ng`).
   - Open **Employee Directory**, select **Jonathan Tan** (`CGCC-005`), and confirm upward chain (`Jonathan Tan -> Nadia Safitri -> Engr. Femi Olatunji -> Pastor Tunde Bakare`) and downward direct reports under **Engr. Femi Olatunji**.
   - Attempt to set `Pastor Tunde Bakare` (`CGCC-000`) to report to `Jonathan Tan` (`CGCC-005`); the backend rejects the circular line with HTTP `422` and the UI displays the error banner.
2. **Entity-Coupled Department Dropdowns (Phase 1):**
   - Open **Add Employee**, switch Entity between **CGCC** and **CSOG**, and verify only departments belonging to that entity appear.
   - Sending a mismatched `entityId` + `departmentId` to `POST /api/v1/employees` directly returns HTTP `422`.
3. **Two-Stage Leave Workflow & Real-Time Updates (Phase 2):**
   - Sign in as **Bayu Wirawan** (`bayu@citadel.ng`) and submit an Annual Leave request. Verify overlap and insufficient-balance requests are rejected with `422`.
   - Open a second browser/tab signed in as **Engr. Femi Olatunji** (`femi.olatunji@citadel.ng`). Bayu's pending request appears in real time via SSE. Click **Approve & Forward to HR** — status transitions to `Pending Review` at Stage 2 (`HR`) with Stage 1 actor and timestamp recorded.
   - Verify **Engr. Femi Olatunji** cannot approve Stage 2 (`HR`) or access `/api/v1/reports/workforce` (`403 Forbidden`).
   - Sign in as **Sussan Afuwape** (`s.afuwape@thecitadelglobal.org`), approve Stage 2 (`Approved` / `COMPLETE`), and confirm Bayu's balance deducts and Bayu's view updates automatically.
   - Repeat with a rejection at Stage 1 or Stage 2 and verify Bayu sees the `Stopped at Stage 1` or `Stopped at Stage 2` banner.
