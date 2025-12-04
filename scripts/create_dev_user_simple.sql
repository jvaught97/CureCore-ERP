-- Create development user directly
-- This creates the profile - the user should sign up via /login page

-- Create user profile for the ID that's trying to authenticate
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
  updated_at = NOW();

SELECT * FROM users WHERE id = 'd18cf358-c654-4e13-b619-8a7709a019db';
