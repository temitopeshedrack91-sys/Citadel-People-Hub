import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.czbwedtrnzlfpdbzlnim:gOE6nE4yMUvg5MAG@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';
const pgClient = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://czbwedtrnzlfpdbzlnim.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_pXHNpxUq9vFpHSJ_Qz4TzQ_SO3nLzR2';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserSeed {
  email: string;
  name: string;
  role: string;
  jobTitle: string;
  staffId: string;
  department: string;
  entityId: string;
  entityName: string;
}

export const USERS_TO_CREATE: UserSeed[] = [
  {
    email: 'dr.adeleke@citadel.ng',
    name: 'Dr. Bukola Adeleke',
    role: 'PCCM_SUPER_ADMIN',
    jobTitle: 'Chief People Officer',
    staffId: 'CGCC-001',
    department: 'People & Culture',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
  {
    email: 'femi.olatunji@citadel.ng',
    name: 'Engr. Femi Olatunji',
    role: 'SYSTEM_ADMIN',
    jobTitle: 'Head of Technology',
    staffId: 'CGCC-002',
    department: 'Technology & Systems',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
  {
    email: 'nadia@citadel.ng',
    name: 'Nadia Safitri',
    role: 'EMPLOYEE',
    jobTitle: 'Lead Product Designer',
    staffId: 'CGCC-003',
    department: 'Technology & Systems',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
  {
    email: 'bayu@citadel.ng',
    name: 'Bayu Wirawan',
    role: 'EMPLOYEE',
    jobTitle: 'Senior Android Engineer',
    staffId: 'CGCC-004',
    department: 'Technology & Systems',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
  {
    email: 'sinta@citadel.ng',
    name: 'Sinta Lubis',
    role: 'EMPLOYEE',
    jobTitle: 'QA & Review Lead',
    staffId: 'CGCC-005',
    department: 'Technology & Systems',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
  {
    email: 'jonathan@citadel.ng',
    name: 'Jonathan Tan',
    role: 'EMPLOYEE',
    jobTitle: 'Backend & Offline Systems Lead',
    staffId: 'CGCC-006',
    department: 'Technology & Systems',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
  {
    email: 'raka@citadel.ng',
    name: 'Raka Aditya',
    role: 'EMPLOYEE',
    jobTitle: 'Data & Growth Analyst',
    staffId: 'CGCC-007',
    department: 'People & Culture',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
  {
    email: 'pastor.bakare@citadel.ng',
    name: 'Pastor Tunde Bakare',
    role: 'BUSINESS_HEAD',
    jobTitle: 'President & General Overseer',
    staffId: 'CGCC-000',
    department: 'Pastoral & Ministry Operations',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
  },
];

async function main() {
  await pgClient.connect();
  console.log('Connected to PostgreSQL.');

  const defaultPassword = 'Password123!';

  for (const u of USERS_TO_CREATE) {
    console.log(`Processing user: ${u.email}...`);

    // Check if user already exists in auth.users
    const existing = await pgClient.query('SELECT id FROM auth.users WHERE email = $1', [u.email]);
    let userId: string;

    const metaData = {
      sub: '',
      email: u.email,
      full_name: u.name,
      role: u.role,
      staff_id: u.staffId,
      department: u.department,
      entity_id: u.entityId,
      entity_name: u.entityName,
      email_verified: true,
      phone_verified: false,
    };

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      metaData.sub = userId;
      console.log(`User ${u.email} exists with id ${userId}. Updating password and confirmation...`);
      await pgClient.query(
        `UPDATE auth.users 
         SET encrypted_password = crypt($1, gen_salt('bf', 10)),
             email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
             raw_user_meta_data = $2::jsonb,
             raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
             confirmation_token = '',
             recovery_token = '',
             email_change_token_new = '',
             email_change = '',
             reauthentication_token = '',
             phone_change = '',
             phone_change_token = '',
             email_change_token_current = '',
             email_change_confirm_status = 0,
             is_sso_user = false,
             is_anonymous = false
         WHERE id = $3`,
        [
          defaultPassword,
          JSON.stringify(metaData),
          userId,
        ]
      );
    } else {
      const insertRes = await pgClient.query(
        `INSERT INTO auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          confirmation_token,
          recovery_token,
          email_change_token_new,
          email_change,
          reauthentication_token,
          phone_change,
          phone_change_token,
          email_change_token_current,
          email_change_confirm_status,
          is_sso_user,
          is_anonymous,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          $1,
          crypt($2, gen_salt('bf', 10)),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          $3::jsonb,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          0,
          false,
          false,
          NOW(),
          NOW()
        ) RETURNING id`,
        [
          u.email,
          defaultPassword,
          JSON.stringify(metaData),
        ]
      );
      userId = insertRes.rows[0].id;
      metaData.sub = userId;
      console.log(`Created new auth user for ${u.email} with id ${userId}`);
    }

    // Ensure identity exists in auth.identities
    const existingId = await pgClient.query(
      'SELECT id FROM auth.identities WHERE user_id = $1 AND provider = $2',
      [userId, 'email']
    );

    if (existingId.rows.length === 0) {
      await pgClient.query(
        `INSERT INTO auth.identities (
          id,
          user_id,
          provider_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3::jsonb,
          'email',
          NOW(),
          NOW(),
          NOW()
        )`,
        [
          userId,
          userId,
          JSON.stringify(metaData),
        ]
      );
    } else {
      await pgClient.query(
        `UPDATE auth.identities 
         SET identity_data = $1::jsonb, updated_at = NOW()
         WHERE user_id = $2 AND provider = 'email'`,
        [JSON.stringify(metaData), userId]
      );
    }

    // Upsert into public.profiles
    await pgClient.query(
      `INSERT INTO public.profiles (id, full_name, role, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role`,
      [userId, u.name, u.role]
    );
  }

  await pgClient.end();
  console.log('PostgreSQL provisioning complete! Now testing all accounts sign in via Supabase Auth...');

  for (const u of USERS_TO_CREATE) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: u.email,
      password: defaultPassword,
    });
    if (error) {
      console.error(`❌ Failed login for ${u.email}:`, error.message);
    } else {
      console.log(`✅ ${u.name} (${u.email}) -> Role: ${data.user.user_metadata?.role}`);
    }
  }
}

main().catch(console.error);
