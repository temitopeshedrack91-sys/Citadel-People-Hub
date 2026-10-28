-- Remove the permissive browser policies from the original schema.
-- This changes access rules only; it does not modify or delete table data.
-- Review the live policy inventory and verify Laravel database-role access before applying.

DROP POLICY IF EXISTS "Public full access to entities" ON public.entities;
DROP POLICY IF EXISTS "Public full access to departments" ON public.departments;
DROP POLICY IF EXISTS "Public full access to employees" ON public.employees;
DROP POLICY IF EXISTS "Public full access to leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Public full access to attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Public full access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public full access to documents" ON public.documents;
DROP POLICY IF EXISTS "Public full access to notifications" ON public.notifications;
