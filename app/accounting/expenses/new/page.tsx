'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  X,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  Building,
  Upload,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  createExpense,
  getExpenseCategories,
  type ExpenseCategory,
} from '@/app/accounting/_actions/expenses'

type PaymentMethod = 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer'

interface ExpenseFormData {
  expense_date: string
  amount: string
  category_id: string
  vendor_name: string
  description: string
  payment_method: PaymentMethod
  check_number: string
  receipt_url: string
  notes: string
  is_recurring: boolean
  recurring_config: {
    name: string
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
    start_date: string
    end_date: string
  }
}

export default function NewExpensePage() {
  const router = useRouter()
  const { toasts, showToast, dismissToast } = useToast()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    category_id: '',
    vendor_name: '',
    description: '',
    payment_method: 'credit_card',
    check_number: '',
    receipt_url: '',
    notes: '',
    is_recurring: false,
    recurring_config: {
      name: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    },
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    const result = await getExpenseCategories()
    if (result.success && result.data) {
      setCategories(result.data)
    } else {
      showToast('Failed to load expense categories', 'error')
    }
    setLoading(false)
  }

  function updateField<K extends keyof ExpenseFormData>(
    field: K,
    value: ExpenseFormData[K]
  ) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function updateRecurringConfig<K extends keyof ExpenseFormData['recurring_config']>(
    field: K,
    value: ExpenseFormData['recurring_config'][K]
  ) {
    setFormData(prev => ({
      ...prev,
      recurring_config: {
        ...prev.recurring_config,
        [field]: value,
      },
    }))
  }

  function getCategoryIcon(iconName: string | null): React.ReactNode {
    if (!iconName) return <FileText className="w-5 h-5" />

    // Map icon names to actual icons
    const iconMap: { [key: string]: React.ReactNode } = {
      'Package': <FileText className="w-5 h-5" />,
      'Box': <FileText className="w-5 h-5" />,
      'Megaphone': <FileText className="w-5 h-5" />,
      'Globe': <FileText className="w-5 h-5" />,
      'Laptop': <FileText className="w-5 h-5" />,
      'CreditCard': <CreditCard className="w-5 h-5" />,
      'FileText': <FileText className="w-5 h-5" />,
      'Briefcase': <FileText className="w-5 h-5" />,
      'Zap': <FileText className="w-5 h-5" />,
      'Building': <Building className="w-5 h-5" />,
      'Shield': <FileText className="w-5 h-5" />,
      'MoreHorizontal': <FileText className="w-5 h-5" />,
    }

    return iconMap[iconName] || <FileText className="w-5 h-5" />
  }

  function getCategoryBadgeColor(color: string | null): string {
    const colorMap: { [key: string]: string } = {
      'amber': 'bg-amber-100 text-amber-800 border-amber-200',
      'orange': 'bg-orange-100 text-orange-800 border-orange-200',
      'pink': 'bg-pink-100 text-pink-800 border-pink-200',
      'cyan': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'indigo': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'green': 'bg-green-100 text-green-800 border-green-200',
      'purple': 'bg-purple-100 text-purple-800 border-purple-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'red': 'bg-red-100 text-red-800 border-red-200',
      'blue': 'bg-blue-100 text-blue-800 border-blue-200',
      'gray': 'bg-gray-100 text-gray-800 border-gray-200',
    }

    return colorMap[color || 'gray'] || colorMap['gray']
  }

  async function handleSubmit() {
    // Validation
    if (!formData.expense_date) {
      showToast('Please select an expense date', 'error')
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error')
      return
    }

    if (!formData.category_id) {
      showToast('Please select a category', 'error')
      return
    }

    if (!formData.description.trim()) {
      showToast('Please enter a description', 'error')
      return
    }

    if (formData.payment_method === 'check' && !formData.check_number.trim()) {
      showToast('Please enter check number for check payments', 'error')
      return
    }

    if (formData.is_recurring && !formData.recurring_config.name.trim()) {
      showToast('Please enter a name for the recurring expense', 'error')
      return
    }

    setSaving(true)

    const result = await createExpense({
      expense_date: formData.expense_date,
      amount: parseFloat(formData.amount),
      category_id: formData.category_id,
      vendor_name: formData.vendor_name.trim() || undefined,
      description: formData.description.trim(),
      payment_method: formData.payment_method,
      check_number: formData.check_number.trim() || undefined,
      receipt_url: formData.receipt_url.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      is_recurring: formData.is_recurring,
      recurring_config: formData.is_recurring ? {
        name: formData.recurring_config.name.trim(),
        frequency: formData.recurring_config.frequency,
        start_date: formData.recurring_config.start_date,
        end_date: formData.recurring_config.end_date || undefined,
      } : undefined,
    })

    setSaving(false)

    if (result.success) {
      showToast(`Expense ${result.data?.expense_number} created successfully!`, 'success')
      setTimeout(() => {
        router.push('/accounting')
      }, 1500)
    } else {
      showToast(result.error || 'Failed to create expense', 'error')
    }
  }

  function handleCancel() {
    if (confirm('Are you sure you want to cancel? All entered data will be lost.')) {
      router.push('/accounting')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#48A999] to-[#2D6A5F] flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">New Expense</h1>
                  <p className="text-sm text-gray-500">Record a business expense</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Basic Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => updateField('expense_date', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => updateField('amount', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => updateField('category_id', category.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            formData.category_id === category.id
                              ? 'border-[#48A999] bg-[#48A999]/5 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${getCategoryBadgeColor(category.color)} flex items-center justify-center`}>
                            {getCategoryIcon(category.icon_name)}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900">{category.name}</div>
                            <div className="text-xs text-gray-500">{category.description}</div>
                          </div>
                          {formData.category_id === category.id && (
                            <Check className="w-5 h-5 text-[#48A999]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vendor Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g., Stripe, Amazon, Shopify"
                      value={formData.vendor_name}
                      onChange={(e) => updateField('vendor_name', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the expense"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Payment Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
              <div className="space-y-4">
                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { value: 'credit_card', label: 'Credit Card' },
                      { value: 'debit_card', label: 'Debit Card' },
                      { value: 'check', label: 'Check' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                    ].map((method) => (
                      <button
                        key={method.value}
                        onClick={() => updateField('payment_method', method.value as PaymentMethod)}
                        className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                          formData.payment_method === method.value
                            ? 'border-[#48A999] bg-[#48A999]/5 text-[#48A999]'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Check Number (conditional) */}
                {formData.payment_method === 'check' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Check number"
                      value={formData.check_number}
                      onChange={(e) => updateField('check_number', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
              <div className="space-y-4">
                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    placeholder="Any additional notes or details..."
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent resize-none"
                  />
                </div>

                {/* Receipt URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt URL
                  </label>
                  <div className="relative">
                    <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      placeholder="https://example.com/receipt.pdf"
                      value={formData.receipt_url}
                      onChange={(e) => updateField('receipt_url', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recurring Expense Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="is-recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => updateField('is_recurring', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#48A999] focus:ring-[#48A999]"
                />
                <label htmlFor="is-recurring" className="text-lg font-semibold text-gray-900 cursor-pointer">
                  This is a recurring expense
                </label>
              </div>

              {formData.is_recurring && (
                <div className="pl-8 space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recurring Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recurring Expense Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Monthly Shopify Subscription"
                        value={formData.recurring_config.name}
                        onChange={(e) => updateRecurringConfig('name', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency
                      </label>
                      <select
                        value={formData.recurring_config.frequency}
                        onChange={(e) => updateRecurringConfig('frequency', e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.recurring_config.start_date}
                        onChange={(e) => updateRecurringConfig('start_date', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                      />
                    </div>

                    {/* End Date */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.recurring_config.end_date}
                        onChange={(e) => updateRecurringConfig('end_date', e.target.value)}
                        min={formData.recurring_config.start_date}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48A999] focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave blank if this expense has no end date
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={
                  saving ||
                  !formData.category_id ||
                  !formData.description.trim() ||
                  !formData.amount.trim() ||
                  isNaN(parseFloat(formData.amount)) ||
                  parseFloat(formData.amount) <= 0
                }
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white font-medium shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Expense
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
