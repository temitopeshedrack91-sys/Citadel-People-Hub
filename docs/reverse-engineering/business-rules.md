# Business rules: current behavior and proposed constraints

Labels: **CURRENT** means visible in Citadel source/tests; **PROPOSED** is a safe requirement for future work, not a verified NotchHR rule; **UNVERIFIED** means details depend on policy-owner decisions or demo access.

## Identity and access

- **CURRENT:** API account login requires valid credentials and active account; successful login issues a Sanctum token; logout revokes the current token. No public signup exists.
- **CURRENT:** Canonical roles include PCCM super admin, business head, department head, and employee, with additional system-admin/HR/admin names in controllers. The enforcement is not uniform across every module.
- **CURRENT:** Employee self-service is keyed to the authenticated user's `staff_id` for several endpoints.
- **PROPOSED:** Never accept an employee/user/tenant identifier as authority. Resolve it from the authenticated account; constrain list queries and individual object access alike. Unknown roles default-deny.
- **UNVERIFIED:** Invitation, activation, reset, password rotation, session expiry, and organization-administrator lifecycle requirements.

## Employment

- **CURRENT:** Staff ID unique; employee belongs to entity/department; managerial relationship is optional; sensitive identifiers, address, NOK, bank, and pension fields are restricted to PCCM in employee responses.
- **PROPOSED:** Preserve former employee and payroll history; deactivation must revoke access and stop future assignments without deleting financial history.
- **UNVERIFIED:** Employment-type vocabulary, title/designation catalogs, work locations, and offboarding checklist policy.

## Attendance

- **CURRENT:** An employee can open one clock session and close it; open-session duplicate and repeated clock-out are conflicts. The API derives/checks identity from authenticated staff ID.
- **PROPOSED:** Overnight shifts use shift-local start/end boundaries; imported events require deterministic source keys; correction changes retain original value, reason, actor, approver, and timestamp. Never infer lateness/overtime without an effective shift, timezone, grace period, break, and rounding policy.
- **UNVERIFIED:** Shift definitions, grace, overtime eligibility, unpaid breaks, missing-clock policy, holidays, correction approvers, import formats, and payroll cut-off.

## Leave

- **CURRENT:** Application has start/end date and a client-supplied day count; reviewer stages are department head → business head → HR/PCCM. Approval appends history and advances stage; rejection/correction closes the flow. Request identity and reviewer scope are checked in selected operations.
- **PROPOSED:** Compute chargeable days server-side from effective policy and organization holiday/weekend calendar; reject overlap with active/approved requests per configured policy; reserve/deduct once via an idempotent ledger event; cancellation/reversal requires an allowed state and compensating ledger event; enforce negative-balance policy under transaction/lock.
- **UNVERIFIED:** Accrual rates, carry-over, probation eligibility, leave-type-specific counting, half-days, public holidays, cancellation windows, rescheduling and final approver.

## Payroll

- **CURRENT:** Draft run calculation reads effective salary assignments and configured components; includes bonuses, deductions, loans/installments, and provident fund logic. Generation/finalization are transactional; finalized runs cannot be regenerated through the same path.
- **PROPOSED:** Enforce one run per tenant/pay period/status policy with a database constraint or locked idempotent creation; snapshot all employee inputs and effective rule versions into each run; finalize only after review/approval; corrections after finalization create an adjustment run instead of rewriting history.
- **UNVERIFIED:** Pay calendar, gross/net definitions, rounding, tax/pension rules and effective dates, overtime rates, leave/attendance deductions, retroactive pay, approval authorities, payment and payslip delivery.
- No Nigerian statutory rate or threshold is asserted here.

## Projects and tasks

- **CURRENT:** Task statuses include `todo`, `in_progress`, `review`, and `completed`; priorities include low/medium/high/urgent. Comments and audits exist.
- **PROPOSED:** Managers create/assign tasks only inside their entity/department; employees see and update progress only on assigned tasks; reassignment and status transitions are audited; notifications are queued only after reliable event/outbox behavior exists.
- **UNVERIFIED:** Attachment constraints, reviewer semantics, task escalation, and deadline reminder schedule.
