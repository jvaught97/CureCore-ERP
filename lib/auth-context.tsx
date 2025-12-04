'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

type UserProfile = {
  id: string
  email: string
  name: string
  role: string
}

type AuthContextType = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 [AUTH] Initializing auth context')

    // Force bypass auth to false - using real database with authentication
    const bypassAuth = false
    const devEmail = process.env.NEXT_PUBLIC_SUPABASE_DEV_EMAIL
    const devPassword = process.env.NEXT_PUBLIC_SUPABASE_DEV_PASSWORD

    const mockUser = {
      id: 'ba702319-205e-49ec-9b8c-5eeba46cab95',
      email: 'thejoeyvaught@yahoo.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
    } as User

    const mockProfile = {
      id: 'ba702319-205e-49ec-9b8c-5eeba46cab95',
      email: 'thejoeyvaught@yahoo.com',
      name: 'Joey Vaught',
      role: 'admin',
    }

    let subscription: ReturnType<typeof supabase.auth.onAuthStateChange> | null = null

    const bootstrap = async () => {
      if (bypassAuth) {
        console.log('🔧 [AUTH] Bypass flag enabled – using mock user')
        setUser(mockUser)
        setProfile(mockProfile)
        setLoading(false)
        return
      }

      try {
        const sessionResponse = await supabase.auth.getSession()
        let session = sessionResponse.data.session

        if (!session && devEmail && devPassword) {
          console.log('🔑 [AUTH] No session found – attempting automatic dev sign-in')
          const { error } = await supabase.auth.signInWithPassword({
            email: devEmail,
            password: devPassword,
          })

          if (error) {
            console.error('❌ [AUTH] Dev sign-in failed:', error)
            setLoading(false)
            return
          }

          session = (await supabase.auth.getSession()).data.session
        }

        console.log('📋 [AUTH] Initial session check:', session ? 'Session exists' : 'No session')
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('👤 [AUTH] User found, fetching profile…')
          fetchProfile(session.user.id)
        } else {
          console.log('👋 [AUTH] No user, setting loading to false')
          setLoading(false)
        }

        subscription = supabase.auth.onAuthStateChange((event, updatedSession) => {
          console.log('🔔 [AUTH] Auth state changed:', event, 'Session:', updatedSession ? 'exists' : 'null')
          setUser(updatedSession?.user ?? null)
          if (updatedSession?.user) {
            console.log('👤 [AUTH] Session user available, refreshing profile…')
            fetchProfile(updatedSession.user.id)
          } else {
            setProfile(null)
            setLoading(false)
          }

          fetch('/api/auth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, session: updatedSession }),
          })
        })
      } catch (error) {
        console.error('❌ [AUTH] Unexpected bootstrap error:', error)
        setLoading(false)
      }
    }

    bootstrap()

    return () => {
      subscription?.data.subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string) {
    console.log('🔍 [AUTH] Starting profile fetch for user:', userId)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle instead of single to handle 0 rows gracefully

      console.log('📦 [AUTH] Profile query result:', { data, error })

      if (error) {
        console.error('❌ [AUTH] Profile fetch error:', error)
        console.error('❌ [AUTH] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      if (!data) {
        console.error('❌ [AUTH] No profile found for user:', userId)
        throw new Error('Profile not found')
      }

      console.log('✅ [AUTH] Profile fetched successfully:', data)
      setProfile(data)
    } catch (error) {
      console.error('❌ [AUTH] Error fetching profile:', error)
      // Still set loading to false even if profile fetch fails
      // This prevents infinite loading state
    } finally {
      console.log('🏁 [AUTH] Profile fetch complete, setting loading to false')
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'http://localhost:54321'
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY
    const usingFallback =
      !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail.includes('@')) {
      const message = 'Use the email on your admin account. Usernames are not supported for sign in.'
      console.error('❌ [AUTH] Invalid identifier provided (no @):', email)
      throw new Error(message)
    }

    console.log('🔐 [AUTH] Starting sign in for:', normalizedEmail, {
      supabaseUrl,
      anonKeyPrefix: supabaseAnonKey?.slice(0, 6),
      usingFallback,
    })

    if (usingFallback) {
      console.error(
        '❌ [AUTH] Supabase env vars missing. The app is pointed at localhost:54321 with dev anon key.'
      )
    }

    if (!supabaseAnonKey) {
      throw new Error('Supabase keys are missing. Set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY and restart.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      const friendlyMessage =
        error.message === 'Invalid login credentials'
          ? 'Invalid email or password. If you were given an admin username, enter the email tied to that account.'
          : error.message

      console.error('❌ [AUTH] Sign in error:', {
        message: error.message,
        status: (error as any)?.status,
        code: (error as any)?.code,
      })
      throw new Error(friendlyMessage)
    }

    console.log('✅ [AUTH] Supabase auth successful, user:', data.user?.id)

    if (data.session) {
      console.log('🔄 [AUTH] Calling /api/auth/callback...')
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
      })

      if (!response.ok) {
        console.error('❌ [AUTH] Callback API failed:', response.status, response.statusText)
      } else {
        console.log('✅ [AUTH] Callback API succeeded')
      }
    }

    console.log('🏁 [AUTH] Sign in complete')
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await fetch('/api/auth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event: 'SIGNED_OUT', session: null }),
    })
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
