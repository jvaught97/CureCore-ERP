'use server';

import type { User } from '@supabase/supabase-js';
import { createClient } from '@/app/utils/supabase/server';

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getClient(client?: ServerSupabaseClient): Promise<ServerSupabaseClient> {
  if (client) return client;
  return await createClient();
}

export async function getCurrentUser(
  client?: ServerSupabaseClient,
  existingUser?: User | null
): Promise<User> {
  if (existingUser) return existingUser;

  const supabase = await getClient(client);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  return user;
}

export async function getCurrentUserId(
  client?: ServerSupabaseClient,
  existingUser?: User | null
): Promise<string> {
  const user = await getCurrentUser(client, existingUser);
  return user.id;
}

export async function getCurrentUserOrgId(
  client?: ServerSupabaseClient,
  existingUser?: User | null
): Promise<string> {
  const supabase = await getClient(client);
  const user = await getCurrentUser(supabase, existingUser);

  const { data, error } = await supabase
    .from('users')
    .select('org_id, tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const orgId =
    data?.org_id ??
    data?.tenant_id ??
    (user.app_metadata?.tenant_id as string | undefined) ??
    null;

  if (!orgId) {
    throw new Error('Organization not found for current user');
  }

  return orgId;
}

export async function getAuthContext(client?: ServerSupabaseClient) {
  const supabase = await getClient(client);
  const user = await getCurrentUser(supabase);
  const orgId = await getCurrentUserOrgId(supabase, user);

  return {
    supabase,
    userId: user.id,
    orgId
  };
}
