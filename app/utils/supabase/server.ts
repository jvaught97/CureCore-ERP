'use server'

import { cookies } from 'next/headers'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'

export async function createServerClient() {
  // Force bypass auth to false - using real database with authentication
  const bypassAuth = false

  // Provide safe fallbacks so the app can still render in demo/bypass mode
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'http://localhost:54321'
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'dev-anon-key'

  if (
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    (process.env.SUPABASE_URL || process.env.SUPABASE_ANON_KEY)
  ) {
    console.warn('⚠️ [SUPABASE] Using SUPABASE_* env vars on the server. Prefer NEXT_PUBLIC_SUPABASE_* for consistency.')
  } else if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.SUPABASE_URL &&
    !process.env.SUPABASE_ANON_KEY
  ) {
    console.error('❌ [SUPABASE] Missing Supabase env vars. Falling back to localhost:54321/dev-anon-key.')
  }

  if (bypassAuth) {
    // In bypass mode, provide dummy cookie handlers (required by @supabase/ssr)
    return createSupabaseServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return [] // Return empty array - no cookies in bypass mode
          },
          setAll() {
            // No-op - don't set any cookies in bypass mode
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: undefined, // Don't use any storage
        },
      }
    )
  }

  // Normal mode with cookie-based auth
  const cookieStore = await cookies()

  const client = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-node',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    }
  )

  // Force schema reload in development
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore - accessing internal property to force schema refresh
    if (client.rest && client.rest.shouldNotPersistSession) {
      // @ts-ignore
      delete client.rest.url
    }
  }

  return client
}

export const createClient = createServerClient
export const createRSCClient = createServerClient
export const createRouteClient = createServerClient
