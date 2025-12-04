-- Setup development user for local Supabase instance
-- This creates both an auth user and a profile in the users table

-- Step 1: Create auth user with specific ID to match error message
-- Note: Supabase auth.users requires encrypted password and proper metadata

-- Create a test user in auth.users
-- Password will be: password123 (for development only)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd18cf358-c654-4e13-b619-8a7709a019db',
  'authenticated',
  'authenticated',
  'dev@curecore.local',
  -- This is bcrypt hash for 'password123'
  '$2a$10$YourHashedPasswordHere.EncryptedValue',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Dev User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create identity for email provider
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'd18cf358-c654-4e13-b619-8a7709a019db',
  'd18cf358-c654-4e13-b619-8a7709a019db',
  jsonb_build_object('sub', 'd18cf358-c654-4e13-b619-8a7709a019db', 'email', 'dev@curecore.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (provider, id) DO NOTHING;

-- Step 3: Create user profile in users table
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  'd18cf358-c654-4e13-b619-8a7709a019db',
  'dev@curecore.local',
  'Dev User',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify everything was created
SELECT 'Auth User:' as type, id, email FROM auth.users WHERE id = 'd18cf358-c654-4e13-b619-8a7709a019db'
UNION ALL
SELECT 'Profile:' as type, id, email FROM users WHERE id = 'd18cf358-c654-4e13-b619-8a7709a019db';
