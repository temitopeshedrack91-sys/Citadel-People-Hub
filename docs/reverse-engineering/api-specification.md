# API specification: existing Laravel v1 contract

**Source of truth:** `backend/routes/api.php`, request validation, controller responses. This catalog records the existing API; it does not claim parity with NotchHR. API routes return JSON. Except for health and login, routes are in `auth:sanctum` and share a 120 requests/minute throttle; route-specific throttles are noted in source.

## Authentication and shared behavior

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Health status and configured service name |
| POST | `/api/v1/auth/login` | Public, 5/min | Credential login; returns bearer token and user data |
| GET | `/api/v1/auth/user` | Sanctum | Current user |
| POST | `/api/v1/auth/logout` | Sanctum | Revoke current token |

Protected mutations generally validate JSON in controllers and return Laravel validation errors (422); explicit scope failures return 403; unauthenticated access returns 401. Resource not-found errors use model binding/`findOrFail` (404). Conflict conditions are returned with 409 in some stateful workflows. Exact envelopes vary by controller.

## Endpoint catalog

| Method | Path | Controller operation |
|---|---|---|
| GET, POST | `/api/v1/entities` | List/create entities |
| GET, POST | `/api/v1/departments` | List/create departments |
| PATCH | `/api/v1/departments/{department}` | Update department |
| GET, POST | `/api/v1/employees` | List/create employees |
| GET | `/api/v1/employees/{employee}` | Employee detail |
| PUT, PATCH | `/api/v1/employees/{employee}` | Update employee |
| DELETE | `/api/v1/employees/{employee}` | Deactivate/delete employee record through controller behavior |
| GET, POST | `/api/v1/leave-requests` | List/submit requests |
| GET | `/api/v1/employees/{employeeId}/leave-requests` | Employee request history |
| PATCH | `/api/v1/leave-requests/{leaveRequest}/status` | Approve/reject/cancel/correct at current stage |
| GET | `/api/v1/leave/categories` | Active categories and policies |
| GET | `/api/v1/leave/balances` | PCCM/HR/admin list; entity-, department-, or employee-scoped balances for other roles |
| GET | `/api/v1/employees/{employeeId}/leave-balances` | Employee balance subject to the caller's employee/entity/department scope |
| GET, POST | `/api/v1/payroll/templates` | List/create salary templates |
| GET, POST | `/api/v1/payroll/assignments` | List/assign salary templates |
| GET, POST | `/api/v1/payroll/runs` | List/generate draft run |
| GET | `/api/v1/payroll/runs/{run}` | Run detail |
| POST | `/api/v1/payroll/runs/{run}/finalize` | Finalize run |
| GET | `/api/v1/payroll/payslips/{item}` | Read authorized payslip |
| PATCH | `/api/v1/payroll/payslips/{item}/paid` | Mark payslip paid |
| GET, POST | `/api/v1/payroll/loans` | List/create loans |
| PATCH | `/api/v1/payroll/loans/{loan}/approve` | Approve loan |
| GET, POST | `/api/v1/payroll/deductions` | List/create deductions |
| GET, POST | `/api/v1/payroll/provident-funds` | List/create provident-fund records |
| GET, POST | `/api/v1/projects` | List/create projects |
| GET, PUT/PATCH, DELETE | `/api/v1/projects/{project}` | Read/update/delete project |
| GET, POST | `/api/v1/tasks` | List/create tasks |
| GET, PUT/PATCH, DELETE | `/api/v1/tasks/{task}` | Read/update/delete task |
| PATCH | `/api/v1/tasks/{task}/status` | Change task status |
| POST | `/api/v1/tasks/{task}/comments` | Add comment |
| GET | `/api/v1/attendance` | List attendance |
| GET | `/api/v1/attendance/today-summary` | Current-day summary |
| POST | `/api/v1/attendance/clock-in` | Open attendance session |
| POST | `/api/v1/attendance/{attendanceRecord}/clock-out` | Close session |
| GET, POST | `/api/v1/documents` | List/upload documents |
| GET | `/api/v1/documents/{document}/download` | Authorized file download |
| GET | `/api/v1/notifications` | List notifications |
| PATCH | `/api/v1/notifications/{notification}/read` | Mark notification read |
| POST | `/api/v1/notifications/read-all` | Mark current user's notifications read |
| GET | `/api/v1/audit-logs` | Privileged audit history |
| GET | `/api/v1/onboarding-journeys` | List onboarding journeys |
| PATCH | `/api/v1/onboarding-journeys/{journey}/tasks/{taskId}` | Update onboarding task |
| GET | `/api/v1/requisitions` | List recruitment requisitions |

## Existing request/response details

- Login accepts credentials; account provisioning is performed through backend CLI commands rather than public registration.
- Leave submission validates employee identifiers, leave type, ISO date range, client-supplied integer `totalDays`, reason, and optional handover fields. The server checks requester identity and current role/scope. `totalDays` is not recalculated from policy/calendar rules yet.
- Task create validates title/description, project/department/priority/status/date/assignee. Before this assignment's authorization patch, authenticated users could enumerate and mutate any task/project.
- Clock-in/out uses authenticated staff identity and returns persisted records; duplicate open sessions and repeated close are conflicts.
- Upload validation and allowed document types/size are in `DocumentController`; successful download streams from private storage.
- Payroll payload details are defined in `PayrollController` and `PayrollService`; percentage rates are configuration fields, not effective-dated statutory versions.

## Authorization matrix (current, with task/project improvements in this assignment)

| Role class | Employee and financial data | Leave | Tasks/projects |
|---|---|---|---|
| PCCM super admin | Broad administrative access | Broad access | Broad access |
| HR staff / admin | HR/controller-dependent | HR/controller-dependent | Project/task management |
| Business head | Entity scoped | Entity scoped, business approval stage | Entity-scoped projects/tasks |
| System admin | Entity scoped when linked | Entity scoped when linked | Entity-scoped projects/tasks; unlinked account gets no records |
| Department head | Department scoped | Department scoped, department approval stage | Department-scoped projects/tasks |
| Employee | Own data | Own requests and balance | Member projects; assigned tasks; can change assigned-task status, cannot administer |

Task/project object checks and leave-balance scopes are enforced in the controllers/service after this assignment's implementation. Role checks remain controller-specific elsewhere; do not assume this table is uniformly enforced outside the listed endpoints.

## Not currently exposed

No backend routes exist for shifts, attendance import/correction, leave balance transactions/accrual, payroll rule versions/review, announcements, employee profile edits, invitations/password reset, payslip file export, or automated reminders.
