import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/context/ThemeContext'
import ChatDock from './(ai)/components/ChatDock'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CureCore ERP',
  description: 'Internal ERP for CureCBD',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <ChatDock />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
