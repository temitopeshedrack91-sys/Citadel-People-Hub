-- ====================================================================
-- Citadel People Hub - Supabase Seed Data
-- ====================================================================

-- 1. ENTITIES
INSERT INTO public.entities (id, name, code, description, head_name)
VALUES
  ('CGCC', 'Citadel Global Community Church', 'CGCC', 'Main church entity, assembly, and ministries', 'Pastor Tunde Bakare'),
  ('CSOG', 'Citadel School of Government', 'CSOG', 'Academic, leadership, and public administration institute', 'Dr. Bukola Adeleke'),
  ('HOLDINGS', 'Citadel Community Holdings', 'CCH', 'Investment, infrastructure, facility management, and social impact ventures', 'Engr. Femi Olatunji')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. DEPARTMENTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_name_key') THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_name_key UNIQUE (name);
  END IF;
END $$;

INSERT INTO public.departments (name, code, description, hod_name, hod_email)
VALUES
  ('People & Culture', 'HR', 'HR, Talent Development, and Staff Welfare', 'Dr. Bukola Adeleke', 'hr@citadel.ng'),
  ('Technology & Systems', 'TECH', 'Platform Engineering, Networks, and Biometric Devices', 'Engr. Femi Olatunji', 'tech@citadel.ng'),
  ('Pastoral & Ministry Operations', 'MIN', 'Pastoral care, service coordination, and protocol', 'Pastor S. Adeleke', 'pastoral@citadel.ng'),
  ('Finance & Treasury', 'FIN', 'Payroll, reconciliation, and audit management', 'Mrs. Yewande Daniels', 'finance@citadel.ng'),
  ('Media & Communications', 'MEDIA', 'Broadcast, publications, and external comms', 'Mr. David Adeleke', 'media@citadel.ng')
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  hod_name = EXCLUDED.hod_name,
  hod_email = EXCLUDED.hod_email;

-- 3. EMPLOYEES
INSERT INTO public.employees (staff_id, first_name, last_name, email, phone, gender, job_title, position, department_name, entity_name, status, employment_type, avatar_bg, avatar_text)
VALUES
  ('CGCC-001', 'Bukola', 'Adeleke', 'dr.adeleke@citadel.ng', '+234 803 111 2233', 'Female', 'Chief People Officer', 'Chief People Officer', 'People & Culture', 'Citadel Global Community Church', 'Active', 'Full-Time', 'bg-[#083E34]', 'text-amber-300'),
  ('CGCC-002', 'Femi', 'Olatunji', 'femi.olatunji@citadel.ng', '+234 802 444 5566', 'Male', 'Head of Technology', 'Head of Technology', 'Technology & Systems', 'Citadel Global Community Church', 'Active', 'Full-Time', 'bg-blue-600', 'text-white'),
  ('CGCC-003', 'Nadia', 'Safitri', 'nadia@citadel.ng', '+234 805 777 8899', 'Female', 'Lead Product Designer', 'Product Designer', 'Technology & Systems', 'Citadel Global Community Church', 'Active', 'Full-Time', 'bg-amber-400', 'text-slate-900'),
  ('CGCC-004', 'Bayu', 'Wirawan', 'bayu@citadel.ng', '+234 809 123 4567', 'Male', 'Senior Android Engineer', 'Senior Android Engineer', 'Technology & Systems', 'Citadel Global Community Church', 'Active', 'Full-Time', 'bg-emerald-500', 'text-white'),
  ('CGCC-005', 'Sinta', 'Lubis', 'sinta@citadel.ng', '+234 810 987 6543', 'Female', 'QA & Review Lead', 'QA Lead', 'Technology & Systems', 'Citadel Global Community Church', 'Active', 'Full-Time', 'bg-purple-500', 'text-white'),
  ('CGCC-006', 'Jonathan', 'Tan', 'jonathan@citadel.ng', '+234 812 345 6789', 'Male', 'Backend & Offline Systems Lead', 'Backend Lead', 'Technology & Systems', 'Citadel Global Community Church', 'Active', 'Full-Time', 'bg-cyan-500', 'text-white'),
  ('CGCC-007', 'Raka', 'Aditya', 'raka@citadel.ng', '+234 814 555 6677', 'Male', 'Data & Growth Analyst', 'Data Analyst', 'People & Culture', 'Citadel Global Community Church', 'Active', 'Full-Time', 'bg-orange-500', 'text-white')
ON CONFLICT (email) DO UPDATE SET 
  job_title = EXCLUDED.job_title,
  staff_id = EXCLUDED.staff_id;

-- Link department_id in employees where matching
UPDATE public.employees e
SET department_id = d.id
FROM public.departments d
WHERE e.department_name = d.name AND e.department_id IS NULL;

-- 4. TRELLIS TASKS (Matching Projects Kanban Board)
INSERT INTO public.tasks (id, title, description, status, labels, due_date, due_tag, assignee_id, assigner_id, assignment_status, reviewer_id, hours, pr_tag, progress_fraction, checklist, comments)
VALUES
  ('PAS-218', 'Let users skip the location permission step', '38% of new users quit on the location screen. Let them skip it and pick their area by hand, then ask again at checkout. Behind the flag onboarding_skip_location, 50% rollout first.', 'In review', ARRAY['Feature', 'Onboarding'], 'Tue, Oct 20', 'Tomorrow', 'user-nadia', 'user-bayu', 'accepted', 'user-sinta', 8, '#482 feat(onboarding): passed skip', '5/5', '[{"id":"chk-1","text":"Add Choose campus zone manually button","done":true},{"id":"chk-2","text":"Area picker with Citadel entities","done":true}]'::jsonb, '[{"id":"c-1","authorId":"user-sinta","authorName":"Sinta Lubis","authorInitials":"SL","authorBg":"bg-purple-500","text":"Looks good. Can we log skip_location so @Raka can see it in the funnel?","timeAgo":"12 min ago"}]'::jsonb),
  ('PAS-227', 'Search: recent and suggested queries', 'Store last 5 search queries in local storage and suggest trending Citadel departments and resources.', 'In review', ARRAY['Feature'], 'Today', 'Today', 'user-sinta', 'user-nadia', 'accepted', NULL, 10, '#477 feat(search): 2 approvals', NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-228', 'Prices show Rp 12.499,99 instead of Rp 12.500', 'Format prices properly according to standard locale with integer rounding.', 'In review', ARRAY['Bug'], 'Oct 21', NULL, 'user-bayu', 'user-sinta', 'accepted', NULL, 12, '#476 fix(price): round IDR', NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-219', 'Camera crashes on Android 12 when scanning a receipt', 'Null pointer exception in CameraX lifecycle binding when barcode scanner is resumed.', 'To do', ARRAY['Bug', 'Android'], 'Oct 21', NULL, 'user-jonathan', 'user-nadia', 'accepted', NULL, 12, NULL, NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-220', 'Empty states for the Orders tab', 'Illustrate friendly empty cart and past deliveries state for new users.', 'To do', ARRAY['Design'], 'Oct 24', NULL, 'user-sinta', 'user-nadia', 'accepted', NULL, 6, NULL, NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-221', 'Audit dark mode colour tokens', 'Ensure contrast ratios meet WCAG AA standards across all Citadel People Hub cards and bottom navigation.', 'To do', ARRAY['Design system'], 'Oct 26', NULL, 'user-nadia', 'user-nadia', 'accepted', NULL, 8, NULL, NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-222', 'Track checkout drop-off by step', 'Implement tracking events on address selection, delivery time slot, and payment gateway.', 'To do', ARRAY['Data'], 'Oct 27', NULL, 'user-raka', 'user-nadia', 'accepted', NULL, 8, NULL, NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-223', 'Push copy for 10.10 promo week', 'Draft marketing push notification copy in Indonesian and English for flash deals.', 'To do', ARRAY['Content'], 'Oct 28', NULL, 'user-nadia', 'user-sinta', 'accepted', NULL, 5, NULL, NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-224', 'Checkout: save address for next time', 'Allow buyers to label saved locations (Home, Office, Apartment) with room numbers and notes.', 'In progress', ARRAY['Feature', 'High'], 'Oct 22', NULL, 'user-bayu', 'user-nadia', 'accepted', NULL, 16, NULL, '3/5', '[]'::jsonb, '[]'::jsonb),
  ('PAS-225', 'Rewrite cart sync with an offline queue', 'Store cart mutations locally via SQLite and retry sync on network reconnection.', 'In progress', ARRAY['Tech', 'High'], 'Oct 26', NULL, 'user-bayu', 'user-jonathan', 'accepted', NULL, 18, NULL, '2/8', '[]'::jsonb, '[]'::jsonb),
  ('PAS-226', 'App Store screenshots', 'Create high-res iPhone 15 Pro mockups showcasing biometric attendance, leave approval, and staff directory.', 'In progress', ARRAY['Marketing'], 'Oct 25', NULL, 'user-nadia', 'user-nadia', 'accepted', NULL, 10, NULL, NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-229', 'Payment sheet redesign with QRIS', 'Integration of dynamic QRIS payment gateway with instant callback receipt.', 'Done', ARRAY['Feature'], 'Oct 18', NULL, 'user-nadia', 'user-bayu', 'accepted', NULL, 14, NULL, NULL, '[]'::jsonb, '[]'::jsonb),
  ('PAS-230', 'Upgrade to React Native 0.81', 'Upgrade React Native runtime for Hermes engine performance and new architecture support.', 'Done', ARRAY['Tech'], 'Oct 15', NULL, 'user-jonathan', 'user-bayu', 'accepted', NULL, 16, NULL, NULL, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  labels = EXCLUDED.labels,
  due_date = EXCLUDED.due_date,
  due_tag = EXCLUDED.due_tag,
  assignee_id = EXCLUDED.assignee_id,
  assigner_id = EXCLUDED.assigner_id,
  assignment_status = EXCLUDED.assignment_status,
  reviewer_id = EXCLUDED.reviewer_id,
  hours = EXCLUDED.hours,
  pr_tag = EXCLUDED.pr_tag,
  progress_fraction = EXCLUDED.progress_fraction,
  checklist = EXCLUDED.checklist,
  comments = EXCLUDED.comments,
  updated_at = NOW();

-- 5. DOCUMENTS
INSERT INTO public.documents (title, category, file_size, mime_type, access_level, storage_path, download_url)
VALUES
  ('Citadel Staff Handbook 2026', 'Policy', '2.4 MB', 'application/pdf', 'All_Staff', 'documents/handbook_2026.pdf', 'https://czbwedtrnzlfpdbzlnim.supabase.co/storage/v1/object/public/documents/handbook_2026.pdf'),
  ('Biometric Attendance & Punctuality Policy', 'Policy', '1.1 MB', 'application/pdf', 'All_Staff', 'documents/biometric_policy.pdf', 'https://czbwedtrnzlfpdbzlnim.supabase.co/storage/v1/object/public/documents/biometric_policy.pdf'),
  ('HMO & Executive Medical Benefits Schedule', 'Benefits', '980 KB', 'application/pdf', 'All_Staff', 'documents/hmo_schedule.pdf', 'https://czbwedtrnzlfpdbzlnim.supabase.co/storage/v1/object/public/documents/hmo_schedule.pdf'),
  ('Church Security & Protocol Standing Order', 'Protocol', '1.8 MB', 'application/pdf', 'Staff_Only', 'documents/protocol_orders.pdf', 'https://czbwedtrnzlfpdbzlnim.supabase.co/storage/v1/object/public/documents/protocol_orders.pdf')
ON CONFLICT DO NOTHING;

-- 6. CALENDAR EVENTS
INSERT INTO public.events (title, description, start_timestamp, end_timestamp, location, category)
VALUES
  ('Sunday Global Convergence', 'Main assembly at The Citadel Auditorium with biometric check-in at all gates', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 3 hours', 'Citadel Main Auditorium', 'Service'),
  ('All-Hands Governance & Ministry Review', 'Quarterly review of ministry KPIs, community development, and school expansion', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 2 hours', 'Executive Boardroom & Online', 'Meeting'),
  ('CSOG Leadership Cohort Orientation', 'Orientation for incoming public administration leadership cohort', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 4 hours', 'CSOG Hall A', 'Training')
ON CONFLICT DO NOTHING;

-- Ensure realtime publication includes all domain tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.entities;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
