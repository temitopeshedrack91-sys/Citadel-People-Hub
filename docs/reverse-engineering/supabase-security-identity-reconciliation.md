# Supabase security and identity reconciliation

**Audit date:** 2026-10-30

**Target checked:** Supabase project `Citadel` (`czbwedtrnzlfpdbzlnim`)

**Change status:** Production remains read-only. A local candidate migration and pgTAP test are prepared for review; neither has been applied to production or run against PostgreSQL.

## Executive finding

The connected Citadel project is not security-cleared. The browser-facing `anon` and `authenticated` roles have broad table privileges. Fourteen public tables have permissive `public` policies for every CRUD operation, and `storage.objects` has the same four open operations. Three buckets are marked public. In addition, a public `SECURITY DEFINER` registration RPC accepts a caller-selected role and writes directly to Supabase Auth and `profiles`.

The frontend still uses direct database paths for Supabase-mode employee, leave, attendance, documents, audit, notification, and Trellis task operations. Restricting production policies before changing those flows would break existing functionality; retaining them preserves exposure. The application has no constraint-backed identity link between a Supabase Auth UUID and the Laravel user/employee identity that carries the backend's role and tenant scope. A policy rollout therefore needs an isolated schema/identity transition first.

## Project identification

- The frontend's configured Supabase URL and the connected project inventory both resolve to **Citadel**, reference `czbwedtrnzlfpdbzlnim`. This is the canonical target for the current frontend runtime configuration.
- `backend/.env.example` still points at a different project reference (`wphvutcehzqseybdfcxq`). The ignored local Laravel environment uses a shared pooler hostname, so its actual project cannot be resolved from the host alone without exposing credentials. The example is not reliable evidence of the deployed Laravel database target.
- The same Supabase account also contains `Kelvora`; no current frontend configuration inspected points to it.
- **Operational ownership remains partly unverified:** confirm the Laravel deployment's actual database target before connecting identity records or planning a production rollout.

## Verified production metadata

### Grants and row policies

RLS is enabled on the inspected public application tables. The current grants give both `anon` and `authenticated` all of `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` on 19 public tables. RLS policies are the only effective row boundary for the rows covered by RLS; broad grants still unnecessarily expose table operations and can make future policy mistakes more damaging.

The following 14 public tables have four permissive policies addressed to the `public` role. Their `USING` or `WITH CHECK` expression is `true`, covering `SELECT`, `INSERT`, `UPDATE`, and `DELETE`:

`approvals`, `attendance_records`, `audit_logs`, `birthdays`, `departments`, `documents`, `employees`, `entities`, `events`, `leave_requests`, `notifications`, `profiles`, `tasks`, and `todos`.

`todos` has eight such policies because two migration generations created overlapping policy names. Permissive policies combine with OR semantics, so adding a restrictive-looking permissive policy does not cancel an existing `true` policy.

Five other RLS-enabled tables have no policies: `onboarding_journeys`, `organizations`, `personal_access_tokens`, `recruitment_requisitions`, and `users`. Those currently default-deny ordinary API roles at the row-policy layer, but `anon` and `authenticated` still have broad table grants. In particular, keep `public.users` and `personal_access_tokens` inaccessible to browser roles; the former includes password-related fields and the latter is an authentication artifact.

### Storage

Buckets `avatars`, `citadel`, and `documents` are all marked `public`. `storage.objects` grants browser roles object CRUD privileges and has four `public`-role policies with unconditional `true` expressions. A public bucket makes object retrieval available to anyone with an object URL; the broad object policies additionally allow anonymous object mutations through the Storage API. No file names, objects, or document contents were queried.

The current document repository uploads to `documents` and builds a public URL. The generic upload helper also accepts a bucket argument and calls `getPublicUrl`. Making the documents bucket private requires replacing these download links with authorized API downloads or short-lived signed URLs, and checking existing path metadata in a safe environment first.

### Auth functions and advisor findings

The live security advisor reported:

| Finding | Count | Verified details |
|---|---:|---|
| RLS enabled, no policy | 5 | The tables listed above |
| Mutable function `search_path` | 2 | `handle_new_user`, `register_user` |
| Publicly callable `SECURITY DEFINER` | 3 | `handle_new_user`, `register_user`, `rls_auto_enable`; callable as both `anon` and `authenticated` |
| Leaked-password protection disabled | 1 | Supabase Auth setting |

`register_user(p_email, p_password, p_full_name, p_role)` is executable by `PUBLIC`, `anon`, and `authenticated`. Its definition inserts directly into `auth.users` and `auth.identities`, marks the email as confirmed, and writes the supplied role into user metadata and `public.profiles`. There is no server-side allow-list for `p_role`. The RPC therefore provides an unauthenticated account-provisioning path with a caller-selected role.

`handle_new_user` is a `SECURITY DEFINER` trigger on `auth.users`; it copies `raw_user_meta_data.role` into `profiles.role` and has no pinned `search_path`. The frontend previously also called the role-assigning registration RPC and read user metadata for its displayed role. The current source changes replace that RPC with standard Supabase Auth signup, send only `full_name`, and read roles from the user's own profile row. New profiles created by the candidate trigger receive `EMPLOYEE`, regardless of editable metadata. This closes the browser-facing role-selection path in code, but it does not change existing live function grants or profile policies until the migration is safely tested and applied.

`rls_auto_enable` is an event-trigger function with `search_path=pg_catalog`, but it is still executable through the exposed API according to the advisor. Its use is DDL-event-specific; revoke API execution unless an intended client workflow is documented.

## Identity and schema comparison

| Identity layer | Identifier and link observed | Security consequence |
|---|---|---|
| Supabase Auth | `auth.users.id` is UUID | Browser sessions identify users by this UUID (`auth.uid()`). |
| Supabase profile | `public.profiles.id` is UUID, with `role` and `full_name` | No foreign key to `auth.users.id` was found in the inspected application FK inventory; the trigger convention is the only source-level link. The live table is currently open to all CRUD operations. The candidate migration grants authenticated SELECT with a self-only policy and no browser write grants. |
| Supabase employee | `public.employees.id` is bigint; `user_id` is nullable UUID | `user_id` has no FK to `auth.users.id`; the only relevant FK found is `employees.department_id → departments.id`. No row-level mapping was read or inferred. |
| Supabase `public.users` | `id` is bigint and it has Laravel-like account fields | This is distinct from `auth.users`; RLS is enabled with no policies. Do not treat it as the Supabase Auth identity table. |
| Laravel user | `users.id` is bigint; `staff_id` is unique | Laravel uses Sanctum and provisions accounts through trusted CLI commands; there is no Supabase UUID field in the Laravel user schema. |
| Laravel employee | `employees.id` and `staff_id` are unique; user accounts are associated by `staff_id` in application code | The Laravel schema does not provide a UUID crosswalk to Supabase Auth. Role, entity, and department scope are read from the Laravel user. |

There is no verified, constraint-backed Supabase Auth UUID → Laravel user ID → employee relation. Email similarity is only a candidate match, not identity proof. **Do not auto-link accounts by email alone.** A verified staff identifier plus an authorized review/provisioning action is needed before a link is active.

An aggregate-only comparison was run using normalized email and staff ID matches; raw names and email addresses were not returned. All 8 Laravel users have one matching Supabase Auth email; 7 of 8 also have an exact employee staff-ID match. One Auth account has no exact employee link. The aggregate found no duplicate normalized emails across the compared sets. Seven profiles are categorized as `EMPLOYEE` (including case-normalized role labels), and the Auth/profile role inventory does not fully align with Laravel roles. This supports a supervised mapping workflow; it does not prove account ownership or authorize automatic linking. The production rows were not modified.

## Frontend database and storage operations

| Frontend location | Direct Supabase operations observed |
|---|---|
| `src/services/supabaseService.ts` | Standard Supabase Auth sign-up/sign-in/sign-out; own-profile read; `tasks` select/upsert/delete and realtime; generic Storage upload and public URL generation. Signup no longer calls `register_user` or upserts a client-selected profile role. |
| `src/services/supabaseAdapter.ts` | `employees` list/read/create/update/delete; `entities` and `departments` read/write; `leave_requests` read/insert/status update; `attendance_records` read/clock-in/clock-out; `documents` read/insert and `documents` bucket upload/public URL; `audit_logs` read/insert; `notifications` read/update |
| `src/components/trellis/TrellisContext.tsx` | Direct `employees` lookup and direct task fetch/write/delete/realtime through `taskDbService` |
| `src/services/dataService.ts` | Selects Laravel adapters only when `VITE_API_BASE_URL` is configured; otherwise selects direct Supabase adapters |
| `src/context/AuthContext.tsx` | Uses Sanctum login and `/auth/user` restoration when Laravel is configured; Supabase Auth only when Laravel is absent; profile role rather than user metadata; local persona auth requires explicit development-only opt-in |

The access path remains environment-dependent, and a Laravel-enabled data adapter does not eliminate every Supabase operation. AuthContext no longer treats a Supabase session as a Laravel login, but Trellis remains direct. Payroll and most talent repositories currently use static data rather than direct Supabase tables.

## Table-by-table policy intent

This is a **target access design**, not deployed SQL. It intentionally keeps policy rules specific to each record type and workflow.

| Data | Browser read intent | Browser write intent | Required source of scope |
|---|---|---|---|
| `profiles` | Own display profile only | Own non-authorization display fields only; never role or identity fields | Auth UUID from the verified identity link |
| `employees` | Own approved self-service fields; manager/HR views per Laravel endpoint scope | Prefer Laravel API for all writes and sensitive columns | Verified employee link plus endpoint-specific entity/department scope |
| `attendance_records` | Own rows; scoped manager/HR rows | Clock actions/corrections through authorized service logic; never client-selected employee ownership | Verified employee link and attendance workflow stage |
| `leave_requests` | Requester and authorized reviewer scope | Employee may submit their own pending request; approval, rejection, cancellation and balance effects through Laravel | Verified employee link, role, tenant scope and approval stage |
| `tasks` | Assigned tasks and manager's authorized project/department scope | Status/progress only for assignee; assignment, deletion, comments and administrative edits through Laravel | Verified employee link, membership and task/project scope |
| `documents` and Storage | Only authorized document metadata and downloads | Upload/delete through an authorized API; use private bucket and expiring signed download | Document employee/entity/department scope plus private object path |
| `notifications` | Current recipient only | Mark own notification read; create/send through server | Verified recipient identity, not a caller-supplied target ID |
| `audit_logs` | Authorized audit readers only | Server writes only; browser cannot forge or alter history | Trusted actor record and the applicable audit role |
| `entities`, `departments`, calendar/approvals | Explicitly approved directory or audience scope | Administrative mutations and approvals through Laravel | Tenant scope and resource-specific authorization |
| `users`, `personal_access_tokens` | No browser-role access | Server/auth subsystem only | Laravel/Supabase service credentials |
| `onboarding_journeys`, `recruitment_requisitions`, `todos`, `birthdays` | Define intended audiences before grants are added | Server or explicitly authorized workflow only | Per-module audience and employee/tenant relation |

The existing Laravel authorization is not a single role-to-scope rule: for example, employee record writes are limited to PCCM, while the task service has additional global and scoped manager roles. The RLS design must mirror each server capability and workflow, rather than treating a frontend role string as a universal permission.

## Migration history and regression source

The applied project history includes `20261024` through `20261029`. The earlier `20261024_000001_remove_public_full_access_policies.sql` drops a set of older policy names. The later `20261029_000001_complete_supabase_sync.sql` loops over application tables and recreates unconditional `true` policies for every CRUD command, marks all three buckets public, recreates unconditional Storage object policies, and installs the metadata-copying auth trigger. This later migration explains why an earlier policy-removal migration is not evidence of current protection.

Do not apply the `20261029` migration as a repair, replay the old removal migration blindly, or append a restrictive permissive policy while the unconditional policies remain. Resolve the migration history in an isolated environment and make grants, RLS, auth functions, Storage access, and the frontend's new operation path part of the same reviewed transition.

## Recommended identity and RLS design

1. **Choose the authoritative account and authorization source.** Laravel currently owns business-role checks and Sanctum API access. Supabase Auth may remain as a temporary or permanent authentication provider, but its UUID must map to a verified Laravel user and employee. Do not authorize from `raw_user_meta_data`, client-selected roles, or a client-writable `profiles.role`.
2. **Create a server-managed identity crosswalk.** Store the Supabase Auth UUID, Laravel user identifier, employee identifier/staff ID, active state, and link provenance in a non-exposed/private schema or an equivalent server-managed mapping. Enforce uniqueness and referential constraints where both records share one database. If the systems use separate databases, provision/synchronize the mapping through trusted backend code. Client roles must not be able to insert or edit this map.
3. **Provision through trusted backend workflows.** Remove public self-assigned role registration. Use a Laravel/Supabase Admin provisioning path with an approved role allow-list; keep profile display data separate from authorization. Pin `search_path` on retained `SECURITY DEFINER` functions and revoke `EXECUTE` from `PUBLIC`, `anon`, and `authenticated` unless a client call is specifically needed.
4. **Choose a data plane per module.** Prefer the existing Laravel API for sensitive writes and for fields needing column-level or business-rule protection. If direct Supabase reads remain, define a separate policy per table and operation using the protected identity map, employee ownership, and verified entity/department scope. Do not grant client `DELETE`, `TRUNCATE`, token access, or arbitrary audit writes.
5. **Scope employee-owned records explicitly.** Test self access for employee/profile, attendance, leave, task assignment, notifications, and documents. Test department/entity access for the applicable manager roles. Keep approvals, audit writes, payroll-sensitive fields, tokens, and administrative mutations server-owned unless a table-specific requirement proves otherwise.
6. **Make sensitive files private.** Move HR documents to a private bucket only in a staged rollout after replacing `getPublicUrl` usage and testing authorized signed downloads. Classify the `citadel` and `avatars` buckets before changing their access model.
7. **Close default privileges.** Pair each table's least-privilege grants with its RLS policies, and change default privileges so a newly created public table/function is not automatically exposed to browser roles. Keep server-only tables out of exposed API schemas where practical.

### Required policy test matrix

Use synthetic fixture identities and records only:

- `anon`: cannot read, insert, update, or delete protected HR rows or Storage objects.
- Unmapped, inactive, or suspended authenticated identity: sees no employee-linked rows and cannot mutate records.
- Employee A: can read only the permitted subset of their own profile, attendance, leave, assigned tasks, notifications, and documents; cannot read Employee B's records or change protected role/approval fields.
- Department head: sees and acts only within the approved department and allowed workflow stage.
- Business/system administrator: is scoped to the authorized entity; PCCM/global roles follow the existing Laravel authorization rules.
- Cross-entity, cross-department, ID substitution, forged user metadata, role escalation, bulk updates, and realtime subscriptions are denied.
- Public and authenticated RPC calls to retained `SECURITY DEFINER` functions are denied unless explicitly required.
- Storage reads and mutations enforce the same ownership/scope as document metadata; private download URLs expire and do not become permanent public links.
- Service-side application flows continue to pass regression checks after grants/policies change.

## Candidate local Auth/profile remediation

The repository now contains `supabase/migrations/20261030150850_harden_auth_registration_and_profiles.sql`. It pins the Auth profile trigger's search path, forces newly created profiles to the low-privilege employee role, revokes API execution of the role-assigning registration RPC and trigger helpers from `PUBLIC`, `anon`, and `authenticated`, restricts `profiles` to self-row reads, and removes browser write grants. Trusted `service_role` execution remains available for the retained service-side functions. This is deliberately narrower than the full security finding and does not change other tables, policies, buckets, or grants.

`supabase/tests/auth_registration_profiles_test.sql` contains 10 pgTAP assertions for the intended role, grants, RLS, policy set, and function behavior. It was not run: `supabase test db` could not connect to the local Supabase Postgres service on `127.0.0.1:54322`, and the environment has no running Docker-backed Supabase stack. No candidate DDL was applied to the connected production project. The migration requires review and execution in an isolated PostgreSQL 17/Supabase environment before rollout.

## Development test attempt and limits

- No Supabase development branches existed for this project. Creating one returned **“Branching is supported only on the Pro plan or above.”** No branch was created.
- Local PostgreSQL 16.14 binaries are installed, but isolated cluster initialization failed because the sandbox denied the required shared-memory operation. No local database or production data was altered.
- Consequently, no candidate RLS DDL has been applied or behavior-tested. The matrix above is a test specification, not a passing security test. Live Postgres is 17.11, so final verification should run against a staging project on the same major version, with synthetic records and both anon and authenticated API roles.
- Production interactions included catalog/metadata reads and aggregate-only identity matching. No raw names/emails, sensitive employee/payroll fields, or storage objects were returned; no live migration or policy change was attempted.

## Additional operational action

During inspection, a direct database connection URI from an ignored local environment file appeared in tool output. It is not copied into this report or committed here. Treat that database password as exposed: rotate it through the Supabase project controls and update local/deployed connection configuration. Rotation was not performed because it can interrupt Laravel and other database clients.

## References

- Supabase [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Supabase [Securing your API: grants and RLS](https://supabase.com/docs/guides/api/securing-your-api)
- Supabase [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- Supabase [Storage bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- Supabase advisor remediation: [mutable function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [public execution of SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated execution of SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
