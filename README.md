# Citadel People Hub

Citadel People Hub is an enterprise workforce management, payroll, and organizational governance system designed for multi-entity structures. It provides employee directory management, compensation and payroll cycles, biometric attendance tracking, multi-tier leave approvals, project management (Trellis), compliance document workflows, and talent onboarding.

The platform combines a React 19 frontend built with Vite and Tailwind CSS with a Laravel 13 REST API backend backed by SQLite or MySQL.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│             React / Vite Frontend (SPA)                  │
│  - React 19, TypeScript, Tailwind CSS, Lucide Icons      │
│  - Sanctum Bearer token storage & retry client           │
│  - Centralized RBAC matrix (ADMIN, HR, EMP, VIEWER)      │
└────────────────────────────┬─────────────────────────────┘
                             │
                             │ HTTPS / Bearer Token
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Laravel 13 REST API Backend                 │
│  - Laravel Sanctum token authentication                  │
│  - Module routes at /api/v1/*                            │
│  - Strict role authorization & audit logging             │
└────────────────────────────┬─────────────────────────────┘
                             │
                             │ Eloquent ORM
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   Database & Storage                     │
│  - SQLite (default for development) or MySQL             │
│  - Local disk / S3 for employee & policy documents       │
└──────────────────────────────────────────────────────────┘
```

The frontend communicates with the backend via `requestLaravel` and `requestLaravelData` in `src/services/laravelClient.ts`. Authentication state is managed via `AuthContext.tsx`. Bearer tokens are persisted to browser local storage.

---

## Requirements

- **PHP**: 8.2 or higher
- **Node.js**: 18.x or 20.x
- **Composer**: 2.x
- **Database**: SQLite (bundled) or MySQL 8.0+

---

## Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Install PHP dependencies
composer install

# Configure environment file
cp .env.example .env

# Generate application encryption key
php artisan key:generate

# Run database migrations and seed default data
php artisan migrate --seed
```

#### Key Backend Environment Variables (`backend/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `APP_NAME` | Name of the application | `Citadel People Hub` |
| `APP_ENV` | Environment name | `local` |
| `APP_KEY` | Laravel encryption key | Set by `php artisan key:generate` |
| `APP_URL` | Base backend URL | `http://localhost:8000` |
| `DB_CONNECTION` | Database driver | `sqlite` |
| `DB_DATABASE` | Database path (SQLite) or name | Absolute path to `database/database.sqlite` |
| `SANCTUM_STATEFUL_DOMAINS` | Frontend domain for SPA cookies | `localhost:5173` |
| `SESSION_DOMAIN` | Session domain | `localhost` |

### 2. Frontend Setup

From the project root:

```bash
# Install frontend dependencies
npm install

# Configure environment file
cp .env.example .env
```

#### Key Frontend Environment Variables (`.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the Laravel API | `http://localhost:8000` |
| `VITE_ENABLE_LOCAL_DEMO_AUTH` | Allow demo persona switcher in development | `false` |
| `VITE_ENABLE_SUPABASE_DIRECT_DEV_ACCESS` | Enable direct browser access to Supabase in dev | `false` |

---

## Running the Application

Start the backend server:

```bash
cd backend
php artisan serve --port=8000
```

In a separate terminal, start the frontend development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Running Tests & Code Quality

### Backend Tests (PHPUnit)

```bash
cd backend
php artisan test
```

### Code Style (Laravel Pint)

```bash
cd backend
./vendor/bin/pint --test
```

### Frontend Tests (Vitest)

```bash
npx vitest run
```

### Frontend Production Build

```bash
npm run build
```

---

## Authentication & Authorization

### Authentication

The system uses **Laravel Sanctum** token-based authentication.

1. **Login**: `POST /api/v1/auth/login` with email and password returns an API bearer token and user object.
2. **Authenticated Requests**: Pass the bearer token in the `Authorization` header:
   ```http
   Authorization: Bearer <token>
   Accept: application/json
   ```
3. **Session Check**: `GET /api/v1/auth/user` validates the token and returns the current user profile.
4. **Logout**: `POST /api/v1/auth/logout` invalidates the active Sanctum token.

When an API call returns `401 Unauthorized`, `src/services/laravelClient.ts` clears the local token and fires a `citadel:unauthorized` window event, returning the user to the sign-in screen.

### Role-Based Access Control (RBAC)

The platform enforces permissions using canonical roles defined in `src/utils/rbac.ts` and `backend/app/Support/RoleAuthorization.php`:

| Canonical Role | Description | Access Scope |
|---|---|---|
| `ADMIN` | Super administrator and system maintainer | Unrestricted access to all modules, audit logs, and system settings. |
| `HR_STAFF` | People & Culture officers | Full access to employee directory, payroll runs, leave approvals, recruitment, and document management. Cannot modify system configurations. |
| `BUSINESS_HEAD` | Executive leadership / General Overseer | Entity-scoped oversight, strategic reporting, and second-stage leave/loan approvals. |
| `DEPARTMENT_HEAD` | Line manager | Department-scoped oversight, employee task tracking, and first-stage leave approvals. |
| `EMPLOYEE` | Standard staff member | Self-service access: personal attendance, leave requests, personal payslips, and assigned project tasks. |
| `VIEWER` | Auditor or read-only stakeholder | Read-only access across allowed organizational directories, calendar, and reports. Zero write/mutation rights. |

---

## API Endpoints Reference

All endpoints are prefixed with `/api/v1`. Authenticated routes require `Authorization: Bearer <token>`.

### Authentication & Profile

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/health` | Health check endpoint | Public |
| `POST` | `/auth/login` | Authenticate credentials and receive token | Public (Rate limited: 5/min) |
| `GET` | `/auth/user` | Get current user profile and role details | Authenticated |
| `PATCH` | `/auth/profile` | Update contact phone and work location | Authenticated |
| `POST` | `/auth/logout` | Revoke current bearer token | Authenticated |

### Organization & Structure

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/entities` | List corporate entities (CGCC, CSOG, etc.) | Authenticated |
| `POST` | `/entities` | Create a new entity | Admin / HR |
| `GET` | `/departments` | List all departments | Authenticated |
| `POST` | `/departments` | Create a department under an entity | Admin / HR |
| `PATCH` | `/departments/{id}` | Update department details or head | Admin / HR |

### Employees

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/employees` | List employees (supports search, entity, and department filters) | Authenticated |
| `POST` | `/employees` | Provision a new employee record and user account | HR / Admin |
| `GET` | `/employees/{id}` | Get detailed employee record | Authenticated |
| `PUT/PATCH` | `/employees/{id}` | Update employee profile data | HR / Admin |
| `DELETE` | `/employees/{id}` | Terminate or remove employee | Admin |

### Payroll & Compensation

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/payroll/templates` | List reusable salary structures | HR / Admin |
| `POST` | `/payroll/templates` | Create or update a salary structure | HR / Admin |
| `GET` | `/payroll/assignments` | List employee salary assignments | HR / Admin |
| `POST` | `/payroll/assignments` | Assign salary structure with effective date window | HR / Admin |
| `GET` | `/payroll/runs` | List payroll run history and draft cycles | Authenticated (scoped) |
| `POST` | `/payroll/runs` | Generate a draft payroll run for a period | HR / Admin |
| `GET` | `/payroll/runs/{id}` | Get payroll run breakdown with payslip items | Authenticated (scoped) |
| `POST` | `/payroll/runs/{id}/finalize` | Finalize run, settle loans, and post pension contributions | HR / Admin |
| `GET` | `/payroll/payslips/{id}` | Retrieve individual payslip details | Employee (self) / HR |
| `PATCH` | `/payroll/payslips/{id}/paid` | Record disbursement payment reference | HR / Admin |
| `GET` | `/payroll/loans` | List employee loans and installment schedules | Authenticated (scoped) |
| `POST` | `/payroll/loans` | Apply for or record an employee loan | Authenticated |
| `PATCH` | `/payroll/loans/{id}/approve` | Advance loan approval (`supervisor` or `final`) | Line Manager / HR |
| `GET` | `/payroll/deductions` | List one-time or recurring deductions | HR / Admin |
| `POST` | `/payroll/deductions` | Configure employee deduction (flat or percentage) | HR / Admin |
| `GET` | `/payroll/provident-funds` | List employee pension / PF settings | HR / Admin |
| `POST` | `/payroll/provident-funds` | Configure employee pension contribution rates | HR / Admin |

### Attendance & Biometrics

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/attendance` | List daily attendance records | Authenticated (scoped) |
| `GET` | `/attendance/today-summary` | Real-time headcount and present/absent stats | Authenticated |
| `GET` | `/attendance/biometric-punches` | List raw device punch events | HR / Admin |
| `POST` | `/attendance/biometric-imports` | Ingest punch logs with `(device_id, timestamp)` deduplication | HR / Admin |
| `POST` | `/attendance/clock-in` | Record self-service web clock-in | Employee |
| `POST` | `/attendance/{id}/clock-out` | Record self-service web clock-out | Employee |

### Leave Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/leave-requests` | List leave requests scoped by role authority | Authenticated |
| `GET` | `/employees/{id}/leave-requests` | List leave requests for a single employee | Authenticated |
| `POST` | `/leave-requests` | Submit a new leave application | Employee / HR |
| `PATCH` | `/leave-requests/{id}/status` | Update approval state (`DEPARTMENT_HEAD`, `BUSINESS_HEAD`, `HR`, `REJECTED`) | Approvers |
| `GET` | `/leave/categories` | List statutory leave categories and allowances | Authenticated |
| `GET` | `/leave/balances` | Query remaining leave balances | Authenticated |

### Projects & Tasks (Trellis)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/projects` | List active projects | Authenticated |
| `POST` | `/projects` | Create a new project | Authenticated |
| `GET` | `/projects/{id}` | Get project details | Authenticated |
| `GET` | `/tasks` | List Kanban tasks (supports sprint, assignee, status filters) | Authenticated |
| `POST` | `/tasks` | Create a new Kanban task | Authenticated |
| `PATCH` | `/tasks/{id}/status` | Move task across columns (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`) | Authenticated |
| `PATCH` | `/tasks/{id}/assignment` | Accept or assign task to an engineer | Authenticated |
| `PATCH` | `/tasks/{id}/checklist` | Toggle subtask checklist items | Authenticated |
| `POST` | `/tasks/{id}/comments` | Add discussion comment to task | Authenticated |

### Documents & Policies

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/documents` | List institutional documents and policies | Authenticated (filtered) |
| `POST` | `/documents` | Upload institutional policy or general managed document | HR Staff |
| `GET` | `/documents/{id}/download` | Stream institutional policy file | Authenticated |
| `GET` | `/employees/{id}/documents` | List an employee's personal compliance documents | Scoped / Self |
| `POST` | `/employees/{id}/documents` | Upload compliance certificate, ID, or contract | Scoped / Self |
| `POST` | `/employees/{id}/documents/{docId}/replace` | Upload revision of an existing document | Scoped / Self |
| `DELETE` | `/employees/{id}/documents/{docId}` | Delete an employee document | Scoped / Self |
| `GET` | `/employees/{id}/documents/{docId}/download` | Stream employee compliance document | Scoped / Self |

### Recruitment & Onboarding

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/requisitions` | List recruitment job requisitions | HR / Line Manager |
| `POST` | `/requisitions` | Create job requisition with auto-generated code | HR / Line Manager |
| `PATCH` | `/requisitions/{id}/status` | Transition requisition status (`Open`, `Filled`, etc.) | HR / Line Manager |
| `GET` | `/checklist-templates` | List reusable onboarding templates | HR / Line Manager |
| `POST` | `/checklist-templates` | Create an onboarding checklist template | HR / Line Manager |
| `GET` | `/onboarding-journeys` | List onboarding journeys in progress | Authenticated (scoped) |
| `POST` | `/onboarding-journeys` | Launch onboarding journey for an employee | HR / Line Manager |
| `POST` | `/onboarding-journeys/{id}/tasks` | Append task to active onboarding journey | HR / Line Manager |
| `PATCH` | `/onboarding-journeys/{id}/tasks/{taskId}` | Toggle onboarding milestone completion | Authenticated |

### Notifications & Audit Logs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/notifications` | List notifications for authenticated user | Authenticated |
| `PATCH` | `/notifications/{id}/read` | Mark individual notification as read | Authenticated |
| `POST` | `/notifications/read-all` | Mark all user notifications as read | Authenticated |
| `GET` | `/audit-logs` | Query governance audit log entries | Admin / HR |

