# NotchHR public product analysis

**Research date:** 2026-10-30  
**Access:** Public official website only. The owner confirmed no demo access is available.

## Evidence standard

This report records public product claims as **DOCUMENTED**. The login page and product marketing do not expose authenticated workflow behavior. Therefore there are no **VERIFIED** NotchHR backend operations, payloads, schemas, API routes, permission checks, database effects, notifications, or error states in this report. Any workflow sketches elsewhere are explicitly **INFERRED** design options, not NotchHR implementation facts.

## Publicly documented capabilities

The official product pages advertise a broad HR platform covering payroll and remittances, employee records, attendance, leave, recruitment, requisitions, exit/offboarding, chat and announcements, performance, e-learning, grievance/disciplinary processes, promotions, and learning and development. The features page links to the application login, but not to public API documentation or a usable demo.

The pricing page groups advertised capabilities into tiers:

| Public plan label | Capabilities described on the official page |
|---|---|
| HR Essentials | Payroll, employee records, tax and pension remittances |
| HR Basic | Attendance, meetings, chats/announcements, requisitions, approval workflow |
| HR Standard | Leave, grievance, employment confirmation, exit, promotion, multi-tenancy, KPI dashboard |
| Premium | E-learning, L&D, talent management, performance, document management, custom reports |
| Time tracker | Work-hour/productivity/task tracking and payroll integration |

These are descriptions of the vendor's offering, not proof that each behavior is implemented or available in every tenant.

The leave page describes an employee mobile experience for checking eligibility, balances, and history; submitting leave with selected assignees; and receiving notifications. It describes manager views for team leave calendars, balances, and history, and HR configuration of workflows. Validation, calendar rules, approval ordering, data model, and notification timing are not specified publicly.

The onboarding page additionally documents welcome messages and information packets before day one, document collection, employee profile completion, digital contract/document handling, initial task and goal assignment, orientation/training completion tracking, employee feedback, and manager evaluation. These are product descriptions; the page does not disclose the internal status machine, permission matrix, API operations, or persistence behavior. [Official onboarding page](https://notchhr.io/onboarding/)

The payroll page documents payroll history, 13th-month processing, non-payroll/vendor and expense records, payroll audits, configurable salary schemes, budgets, transaction/payment logs, general-ledger account management, and attendance integration. It also advertises tax/pension calculations and remittances. These claims do not establish the supported statutory formulas, approval gates, payment provider, or audit event schema. [Official payroll page](https://notchhr.io/payroll/)

## Access and limits

- The public login page at `https://app.notchhr.io/login` did not provide readable workflow content to this inspection.
- The user confirmed no authorized demo credentials or demo account are available.
- No authentication, browser storage, API requests, or private content was bypassed or inspected.
- No NotchHR endpoint, request schema, database table, statutory rate, or internal implementation is inferred from its marketing claims.

## Requirements we can safely use

The public descriptions support a **DOCUMENTED** comparison of product areas: leave balances/history/workflows/notifications, attendance, payroll, employee records, recruitment/requisitions, offboarding, tasks/time tracking, performance, learning, documents, and announcements. Citadel implementation decisions must be based on Citadel's own needs and code; details absent from public materials remain **UNVERIFIED** pending legitimate demo access.

## Official sources

- [NotchHR features](https://notchhr.io/features/)
- [NotchHR pricing](https://notchhr.io/pricing/)
- [NotchHR leave management](https://notchhr.io/leave-management/)
- [NotchHR onboarding](https://notchhr.io/onboarding/)
- [NotchHR payroll](https://notchhr.io/payroll/)
- [NotchHR application login](https://app.notchhr.io/login)
- [NotchHR company profile (PDF)](https://www.notchhr.io/wp-content/uploads/2024/10/NotchHR-Company-Profile-PDF.pdf)
