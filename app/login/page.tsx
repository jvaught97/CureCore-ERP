'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)
  const { signIn, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = useMemo(() => {
    const redirect = searchParams?.get('redirect')
    // Prevent redirecting back to login page or any /app/login path
    if (!redirect || redirect === '/login' || redirect.includes('/login')) {
      return '/dashboard'
    }
    return redirect
  }, [searchParams])

  // Middleware handles redirect for authenticated users
  // No client-side redirect needed

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('🔐 [LOGIN] Form submitted, attempting sign in...')

    try {
      await signIn(email, password)
      console.log('✅ [LOGIN] Sign in successful, redirecting to:', redirectPath)
      // Use window.location for hard redirect to ensure middleware runs
      window.location.href = redirectPath
    } catch (err: any) {
      console.error('❌ [LOGIN] Sign in failed:', err)
      const errorMessage = err?.message || 'Invalid email or password'
      console.error('❌ [LOGIN] Error message:', errorMessage)
      setError(errorMessage)
    } finally {
      console.log('🏁 [LOGIN] Setting loading to false')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#174940]">CureCore</h1>
          <p className="text-gray-600 mt-2">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Use the email on your admin account. Usernames or invite codes will not work here.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#174940] text-white py-2 rounded hover:bg-[#1a5c51] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
