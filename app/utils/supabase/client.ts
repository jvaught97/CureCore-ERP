'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a browser-safe Supabase client for use in React components and hooks.
 * - Uses the public anon key (never secrets)
 * - Disables automatic JSON parsing of base64 cookies
 * - Keeps a single instance for performance
 */

let browserClient: ReturnType<typeof createBrowserClient> | null = null
let previousBypassAuth: boolean | undefined = undefined
let previousUrl: string | undefined = undefined

export function createClient() {
  // Force bypass auth to false - using real database with authentication
  const bypassAuth = false
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
    console.warn('⚠️ [SUPABASE] Using SUPABASE_* env vars. Prefer NEXT_PUBLIC_SUPABASE_* for client builds.')
  } else if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.SUPABASE_URL &&
    !process.env.SUPABASE_ANON_KEY
  ) {
    console.error('❌ [SUPABASE] Missing Supabase env vars. Falling back to localhost:54321/dev-anon-key.')
  }

  // In development, always recreate client to avoid stale schema cache
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 [SUPABASE DEV] Forcing client recreation in development mode')
    browserClient = null
  }

  // Reset client if bypass auth mode OR URL changed
  if (browserClient && (previousBypassAuth !== bypassAuth || previousUrl !== supabaseUrl)) {
    console.log('🔄 [SUPABASE] Recreating client due to config change')
    browserClient = null
  }

  if (browserClient) return browserClient

  previousBypassAuth = bypassAuth
  previousUrl = supabaseUrl

  browserClient = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // When bypass auth is enabled, don't persist session to avoid auth errors
        persistSession: !bypassAuth,
        // Don't auto-refresh session when bypass auth is enabled
        autoRefreshToken: !bypassAuth,
        // Don't detect session in URL when bypass auth is enabled
        detectSessionInUrl: !bypassAuth,
      },
    }
  )

  return browserClient
}
