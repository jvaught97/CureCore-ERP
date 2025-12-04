import { Loader2 } from 'lucide-react'

type SettingsSubmitButtonProps = {
  loading: boolean
  children: React.ReactNode
  disabled?: boolean
  variant?: 'primary' | 'danger'
}

export function SettingsSubmitButton({
  loading,
  children,
  disabled,
  variant = 'primary',
}: SettingsSubmitButtonProps) {
  const baseClasses =
    'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const variantClasses = {
    primary: 'bg-[#174940] text-white hover:bg-[#0f332c] disabled:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400',
  }

  return (
    <button type="submit" disabled={loading || disabled} className={`${baseClasses} ${variantClasses[variant]}`}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
