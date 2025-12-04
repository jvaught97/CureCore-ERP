import { AppNav } from '@/components/nav/AppNav'

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-gray-50">{children}</main>
    </>
  )
}
