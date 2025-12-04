-- Create user profile for authenticated user
-- User ID: d18cf358-c654-4e13-b619-8a7709a019db

-- First, check if auth user exists
DO $$
DECLARE
  auth_user_email TEXT;
BEGIN
  SELECT email INTO auth_user_email
  FROM auth.users
  WHERE id = 'd18cf358-c654-4e13-b619-8a7709a019db';

  IF auth_user_email IS NULL THEN
    RAISE EXCEPTION 'Auth user not found with ID: d18cf358-c654-4e13-b619-8a7709a019db';
  END IF;

  RAISE NOTICE 'Found auth user with email: %', auth_user_email;
END $$;

-- Insert user profile (if not exists)
INSERT INTO users (id, email, name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email), -- Use metadata name or email
  'admin', -- Set as admin role
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id = 'd18cf358-c654-4e13-b619-8a7709a019db'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verify the profile was created
SELECT id, email, name, role FROM users WHERE id = 'd18cf358-c654-4e13-b619-8a7709a019db';
