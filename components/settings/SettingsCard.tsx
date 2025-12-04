import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

type SettingsCardProps = {
  title: string
  description?: string
  icon?: LucideIcon
  children: ReactNode
}

export function SettingsCard({ title, description, icon: Icon, children }: SettingsCardProps) {
  return (
    <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-3 text-[#174940]">
          {Icon && <Icon className="h-5 w-5" />}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      {children}
    </section>
  )
}
