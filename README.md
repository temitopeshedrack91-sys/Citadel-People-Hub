# Citadel People Hub

HR directory, organizational hierarchy, and two-stage leave management platform built with **React + Vite (TypeScript)** on the frontend and **Laravel (PHP 8.2+)** JSON + Server-Sent Events (SSE) API on the backend, backed by a relational SQLite/MySQL/PostgreSQL schema.

---

## Architecture Notes

### Stack & Relational Database
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4 (`src/`).
- **Backend:** Laravel 13 on PHP (`backend/`), stateless token auth via Laravel Sanctum (`Authorization: Bearer <token>`), REST JSON endpoints (`/api/v1/*`), and SSE (`/api/v1/realtime/stream`) + delta polling (`/api/v1/realtime/events`).
- **Database:** Relational SQLite (`backend/database/database.sqlite` configured out of the box) or PostgreSQL/MySQL with foreign keys across `entities`, `departments`, `employees` (self-referencing `manager_id`), `leave_categories`, `leave_policies`, `employee_leave_balances`, `leave_requests`, and `realtime_events`.

### Backend Separation of Concerns (`backend/app/`)
- **Routing:** `backend/routes/api.php` registers versioned `/api/v1/*` routes and applies `auth:sanctum` and rate limiting.
- **Authorization:** `App\Support\RoleAuthorization` normalizes roles (`ADMIN`, `HR_STAFF`/`PCCM_SUPER_ADMIN`, `MANAGER`, `EMPLOYEE`, `VIEWER`/`AUDITOR`), detects Phase 1 supervisory status from `employees.manager_id` (`isSupervisor`), and enforces data visibility and endpoint permissions server-side on every request.
- **Data Access (Repositories):** `App\Repositories\OrganizationRepository`, `EmployeeRepository`, and `LeaveRepository` isolate database queries for entities, departments, hierarchy edges, balances, overlapping leave checks, and scoped team calendars.
- **Business Logic (Services):**
  - `App\Services\EmployeeHierarchyService`: Validates reporting lines (`assertNoCycle`), walks upward ancestor chains (`getSupervisorChain`), fetches downward direct reports (`getDirectReports`), and computes reporting subtrees (`getSubtreeEmployeeIds`).
  - `App\Services\LeaveWorkflowService`: Phase 2 workflow built directly on top of Phase 1 `employees.manager_id`. Validates date ranges, overlapping requests, and available leave balance; routes requests to Stage 1 (`MANAGER`) when an employee has a direct supervisor or directly to Stage 2 (`HR`) otherwise; enforces stage transitions (`MANAGER` -> `HR` -> `COMPLETE`), stops rejected requests at their exact stage (`stopped_at_stage`), records actors and timestamps (`manager_actor_*`, `hr_actor_*`), adjusts balances, creates notifications, and emits realtime events.
  - `App\Services\RealtimeEventService`: Appends mutations to `realtime_events` for SSE streaming and delta sync.
- **HTTP Error Handling (`backend/bootstrap/app.php`):** Consistent JSON responses for `422` validation errors, `401` unauthenticated, `403` forbidden, `404` not found, and `500` database query errors.

### Frontend Structure (`src/`)
- **Repositories & Realtime Sync:** `src/services/laravelClient.ts`, `src/services/laravelAdapter.ts`, `src/services/realtimeSync.ts`, and `src/hooks/useRealtimeTable.ts` connect views to the PHP API with cross-tab `BroadcastChannel` + SSE/polling live updates.
- **Auth & RBAC:** `src/context/AuthContext.tsx` restores Sanctum sessions via `GET /api/v1/auth/user` on page reload; `src/utils/rbac.ts` computes permissions while relying on server enforcement.
- **Phase 1 & Phase 2 Views:**
  - `DirectoryView.tsx`, `EmployeeManagementView.tsx`, `CreateEmployeeModal.tsx`, `EmployeeProfileModal.tsx`: Coupled Entity/Department dropdowns, cycle-protected supervisor dropdown, upward chain & downward reports display.
  - `LeaveManagementView.tsx`: Real leave balances, Phase 1 hierarchy auto-routing, two-stage approval/rejection controls with stage stop indicators and stage actor history.
  - `DashboardView.tsx`, `EmployeeDashboard.tsx`, `DepartmentHeadDashboard.tsx`, `CalendarView.tsx`, `ReportsView.tsx`: Role-scoped dashboards for Employee, Manager/Supervisor, and HR/Admin.

---

## Configuration

### Frontend (`.env`)
```env
VITE_API_BASE_URL="http://localhost:8088"
APP_URL="http://localhost:3000"
```

### Backend (`backend/.env`)
```env
APP_URL=http://localhost:8088
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
DB_CONNECTION=sqlite
# PHP built-in server worker count for concurrent requests & SSE:
PHP_CLI_SERVER_WORKERS=4
```

To use **MySQL** or **PostgreSQL** instead of SQLite, update `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `backend/.env` before running migrations.

---

## API Surface (`/api/v1`)

- **Authentication & Dashboard**
  - `POST /api/v1/auth/login` — Authenticate with email/password, returns Sanctum Bearer token and user profile (`effectiveRole`, `isSupervisor`, `directReportsCount`, `managerId`, `managerName`).
  - `GET /api/v1/auth/user` — Return authenticated user context.
  - `POST /api/v1/auth/logout` — Revoke active Bearer token.
  - `GET /api/v1/dashboard/summary` — Role-scoped KPIs, pending queue, and recent requests.
- **Phase 1: Organization, Directory & Hierarchy**
  - `GET /api/v1/entities` / `POST /api/v1/entities`
  - `GET /api/v1/departments?entityId=&activeOnly=` / `POST /api/v1/departments` / `PATCH /api/v1/departments/{department}`
  - `GET /api/v1/employees` / `POST /api/v1/employees` / `GET /api/v1/employees/{employee}` / `PATCH /api/v1/employees/{employee}` / `DELETE /api/v1/employees/{employee}` — Enforces coupled entity/department match and acyclic `manager_id`.
  - `GET /api/v1/employees/{employee}/hierarchy` — Returns `{ employee, supervisorChain, directReports }`.
- **Phase 2: Two-Stage Leave Workflow & Calendar**
  - `GET /api/v1/leave/categories` — Active leave types and policy quotas.
  - `GET /api/v1/leave/balances` — Leave balances scoped by role.
  - `GET /api/v1/leave/team-calendar` — Scoped leave calendar for Managers and HR.
  - `GET /api/v1/leave-requests` / `POST /api/v1/leave-requests` — Scoped requests; server validates dates, overlaps, and balance.
  - `PATCH /api/v1/leave-requests/{leaveRequest}/status` — Two-stage transition (`Approved` advances `MANAGER -> HR -> COMPLETE`; `Rejected` stops at current stage).
- **HR Reporting & Realtime**
  - `GET /api/v1/reports/workforce`, `GET /api/v1/reports/leave-utilization`, `GET /api/v1/reports/attendance-summary`, `GET /api/v1/reports/recruitment-summary` — Restricted to `HR_STAFF`/`ADMIN` (`403` for Managers and Employees).
  - `GET /api/v1/realtime/events?since={id}` and `GET /api/v1/realtime/stream` — Realtime change feed (`?token=` supported for `EventSource`).

---

## Setup & Run Instructions

### 1. Install Dependencies
```bash
# Backend dependencies
cd backend
composer install

# Frontend dependencies (from repository root)
cd ..
npm install
```

### 2. Migrate and Seed Database
```bash
cd backend
php artisan migrate:fresh --seed
```

Seeded accounts (all use password `Password123!`):
- **System Admin:** `sysadmin@citadel.ng` (`ADMIN`)
- **HR Admin:** `dr.adeleke@citadel.ng` (`PCCM_SUPER_ADMIN`)
- **HR Staff:** `s.afuwape@thecitadelglobal.org` (`HR_STAFF`)
- **Manager:** `femi.olatunji@citadel.ng` (`MANAGER`, ICT — reports to `Pastor Tunde Bakare`)
- **Manager:** `omoaholo@citadel.ng` (`MANAGER`, CSOG — reports to `Pastor Tunde Bakare`)
- **Supervisor Employee:** `nadia@citadel.ng` (`EMPLOYEE` supervising `Jonathan Tan` in ICT)
- **Employee:** `bayu@citadel.ng` (`EMPLOYEE`, reports to `Engr. Femi Olatunji`)
- **Employee (2-Level Hierarchy):** `jonathan@citadel.ng` (`EMPLOYEE`, reports to `Nadia Safitri`)
- **Viewer:** `grace.okafor@citadel.ng` (`AUDITOR`)

### 3. Start Backend & Frontend Servers
Terminal 1 (PHP API on port `8088` with multi-worker support for SSE + concurrent calls):
```bash
cd backend
PHP_CLI_SERVER_WORKERS=4 php artisan serve --no-reload --host=127.0.0.1 --port=8088
```

Terminal 2 (React + Vite frontend on port `3000`):
```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Automated Tests

```bash
# Backend PHPUnit test suite (hierarchy cycles, entity/department pairing, 2-stage transitions, RBAC, SSE)
cd backend && php artisan test

# Frontend TypeScript check, Vitest test suite, and production build
npm run lint
npm test
npm run build
```

---

## Feature Verification Walkthrough

1. **Hierarchy & Cycle Check (Phase 1):**
   - Sign in as HR (`dr.adeleke@citadel.ng`).
   - Open **Directory** and click **Jonathan Tan** -> verify the upward chain shows `Nadia Safitri` then `Engr. Femi Olatunji` then `Pastor Tunde Bakare`, and selecting **Nadia Safitri** shows `Jonathan Tan` under downward Direct Reports.
   - Open **Employees -> Edit Records** on **Engr. Femi Olatunji**, try setting Supervisor to **Nadia Safitri** (his own subordinate) -> verify the backend rejects the circular reporting line (`422`).
2. **Coupled Entity & Department Dropdowns (Phase 1):**
   - In **Employees -> Enroll Staff** or **Edit Records**, switch **Assigned Entity** between CGCC and CSOG -> verify the **Assigned Department** dropdown filters strictly to departments owned by that entity.
3. **Two-Stage Leave Workflow & Realtime Sync (Phase 2):**
   - Sign in as `bayu@citadel.ng` in browser Tab A -> submit an Annual Leave request (`reason`, dates) -> notice it starts at `Submitted` (`Stage 1: Direct Supervisor — Engr. Femi Olatunji`).
   - Sign in as `femi.olatunji@citadel.ng` in browser Tab B (or another browser session) -> Stage 1 Team Leave Approval Queue shows Bayu's request; click **Approve & Forward to HR** -> request advances to `Pending Review` (`Stage 2: HR`).
   - Sign in as `s.afuwape@thecitadelglobal.org` -> grant **HR Final Approve** -> status becomes `Approved` and balances deduct; verify submitting a request that gets rejected at Stage 1 or Stage 2 displays the exact stage where it stopped and actor timestamp.
4. **Role-Scoped Enforcement (Phase 2):**
   - As `femi.olatunji@citadel.ng` (Manager) or `bayu@citadel.ng` (Employee), **Reports** and HR employee management endpoints return `403 Forbidden` when queried directly on `/api/v1/reports/*`, while Managers see their team's pending approvals and team calendar.
