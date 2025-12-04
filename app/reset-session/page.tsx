'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetSession() {
  const router = useRouter()

  useEffect(() => {
    async function reset() {
      // Clear all localStorage
      localStorage.clear()

      // Clear all sessionStorage
      sessionStorage.clear()

      // Sign out via API
      await fetch('/api/auth/logout', { method: 'POST' })

      // Wait a moment then redirect
      setTimeout(() => {
        router.push('/login')
      }, 1000)
    }

    reset()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Resetting Session...</h1>
        <p className="text-gray-600">You will be redirected to login shortly.</p>
      </div>
    </div>
  )
}
