# Role-Based Access Control (RBAC) Specification & Architecture

**Citadel People Hub (CGCC PCCM)**  
*Document Version:* 1.0.0  
*Module Implementation:* `src/utils/rbac.ts`

---

## 1. Overview & Architecture

Citadel People Hub implements a centralized Role-Based Access Control (RBAC) system. All authorization rules are maintained in a single source of truth at [`src/utils/rbac.ts`](../src/utils/rbac.ts).

### Multi-Tier Defense:
1. **Visual / Navigation Tier**: [`Sidebar.tsx`](../src/components/layout/Sidebar.tsx) filters navigation links using `canAccessModule(currentUser, moduleId)`.
2. **Client-Side Route Guard**: [`App.tsx`](../src/App.tsx) intercepts every module change and direct URL hash jump via `checkRouteAccess(currentUser, currentModule)`. If unauthorized, it displays a dedicated 401/403 denial view ([`AccessDeniedView.tsx`](../src/components/common/AccessDeniedView.tsx)).
3. **Data Access & Scoping Tier**: [`EmployeeManagementView.tsx`](../src/components/views/EmployeeManagementView.tsx) and related views enforce department boundaries via `filterEmployeesForUser(currentUser, employees)` and mask confidential records via `maskSensitiveEmployeeData(currentUser, employee)`.
4. **API & Service Authorization Tier**: Services and endpoints call `authorizeApiRequest(user, { module, action, targetDepartmentName })`, returning explicit HTTP status codes (`401 Unauthenticated`, `403 Forbidden`).

---

## 2. Canonical Roles & Role Aliases

The system maps all historical and platform-specific role strings into four **Canonical Roles**:

| Canonical Role | Mapped Legacy / Platform Aliases | Description |
| :--- | :--- | :--- |
| **`ADMIN`** | `ADMIN`, `SYSTEM_ADMIN`, `SYSADMIN`, `SUPER_ADMIN` | Unrestricted full access across all 19 modules, system settings, integrations, and audit logs. |
| **`HR_STAFF`** | `HR_STAFF`, `PCCM_SUPER_ADMIN`, `HR_MANAGER`, `BUSINESS_HEAD`, `DEPARTMENT_HEAD` | Cross-department HR operations (recruitment, onboarding, offboarding, performance, reports). Strictly forbidden from system settings and technical audit trails. |
| **`EMPLOYEE`** | `EMPLOYEE`, `STAFF`, `USER` | Self-service access (attendance, personal leave, assigned projects, directory). Scoped strictly to their own department. |
| **`VIEWER`** | `VIEWER`, `AUDITOR`, `READONLY`, `GUEST` | Read-only compliance and auditing access across public directory, shared calendar, documents, and reports. Zero mutation rights. |

---

## 3. Module Access Permission Matrix

| Module Name | Module ID | Admin | HR Staff | Employee (Dept Scoped) | Viewer (Read-Only) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Dashboard | `dashboard` | ✅ | ✅ | ✅ | ✅ |
| Staff Directory | `directory` | ✅ | ✅ | ✅ | ✅ |
| Attendance & Check-ins | `attendance` | ✅ | ✅ | ✅ | ❌ |
| Leave Applications | `leave` | ✅ | ✅ | ✅ (Own/Dept) | ❌ |
| Projects Kanban Board | `projects` | ✅ | ✅ | ✅ | ❌ |
| Church Calendar | `calendar` | ✅ | ✅ | ✅ | ✅ |
| Team Notes & Handover | `team-notes` | ✅ | ✅ | ✅ | ✅ |
| Documents Vault | `documents` | ✅ | ✅ | ✅ | ✅ |
| AI Assistant | `ai-assistant` | ✅ | ✅ | ✅ | ✅ |
| Workforce Reports | `reports` | ✅ | ✅ | ❌ | ✅ |
| Employee Management | `employees` | ✅ | ✅ | ❌ | ❌ |
| Recruitment & Talent | `recruitment` | ✅ | ✅ | ❌ | ❌ |
| Staff Onboarding | `onboarding` | ✅ | ✅ | ❌ | ❌ |
| Offboarding & Exit | `offboarding` | ✅ | ✅ | ❌ | ❌ |
| Performance Reviews | `performance` | ✅ | ✅ | ❌ | ❌ |
| Notifications Center | `notifications` | ✅ | ✅ | ✅ | ✅ |
| System Settings | `settings` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| Biometric & API Integrations | `integrations` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| Audit Trail & Governance | `audit-logs` | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |

---

## 4. Department-Level Scoping & Data Masking

### Department Boundary Rules
- **Admin & HR Staff**: Can inspect employee profiles, leave requests, and attendance rosters across all Citadel entities (`CGCC`, `CSOG`, `HOLDINGS`) and departments.
- **Employee**: Can view only colleagues in their **own department** in directory and staff lists (`Technology & Systems`, `People & Culture`, etc.). Leave requests and clock-in logs for other departments are strictly filtered out at the query level.
- **Viewer**: Can view directory across departments in read-only mode, but cannot mutate any records.

### Sensitive Data Masking (`maskSensitiveEmployeeData`)
For non-authorized roles (`EMPLOYEE` and `VIEWER`), the following compensation and identity fields are automatically masked:
- `salary`: set to `undefined`, and `salaryFormatted` set to `"[Confidential - PCCM Access Only]"`.
- `bankAccountNumber`: masked as `"••••••••"`.
- `bankName`: masked as `"••••••••"`.
- `bvn`: masked as `"•••••••••••"`.
- `nationalId`: masked as `"•••••••••••"`.

---

## 5. Denial Responses & Status Codes

Denials return explicit HTTP statuses rather than failing silently:
- **`401 Unauthenticated`**: Returned when `currentUser` is null/undefined. Displays message: *"Authentication required. Please sign in to access Citadel People Hub."*
- **`403 Forbidden`**: Returned when the user's role does not satisfy module permissions or attempts a department scoping violation. Displays the user's canonical role, attempted module, and exact policy reason.

---

## 6. How to Extend With New Roles or Permissions

To add a new role (e.g., `'FINANCE_OFFICER'`):

1. **Update `CanonicalRole` in `src/utils/rbac.ts`**:
   ```ts
   export type CanonicalRole = 'ADMIN' | 'HR_STAFF' | 'EMPLOYEE' | 'VIEWER' | 'FINANCE_OFFICER';
   ```

2. **Add Alias Mapping to `normalizeRole`**:
   ```ts
   case 'FINANCE_OFFICER':
   case 'FINANCE':
   case 'TREASURY':
     return 'FINANCE_OFFICER';
   ```

3. **Define Allowed Modules in `ROLE_MODULE_PERMISSIONS`**:
   ```ts
   FINANCE_OFFICER: [
     'dashboard',
     'directory',
     'reports',
     'documents',
     'calendar',
     // ...
   ],
   ```

4. **Define Action Permissions in `getRolePermissions`**:
   ```ts
   case 'FINANCE_OFFICER':
     return {
       canManageEmployees: false,
       canViewAllEmployees: true,
       canViewSensitiveData: true, // Finance requires salary/bank access
       canExportReports: true,
       // ...
     };
   ```

5. **Run the Test Suite**:
   ```bash
   npx vitest run src/__tests__/rbac.test.ts src/__tests__/SidebarRBAC.test.tsx
   ```
