'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  TrialBalanceEntry,
  BalanceSheetData,
  ProfitAndLossData,
  CashFlowData,
  AccountingDashboardKPIs,
} from '@/types/accounting'

export async function fetchTrialBalance(as_of_date?: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trial_balance')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return data as TrialBalanceEntry[]
}

export async function fetchBalanceSheet(as_of_date: string): Promise<BalanceSheetData> {
  const supabase = await createClient()

  // Fetch account balances as of date
  const { data: balances, error } = await supabase
    .from('account_balances')
    .select('*')

  if (error) throw error

  const assets = balances?.filter(b => b.account_type === 'asset') || []
  const liabilities = balances?.filter(b => b.account_type === 'liability') || []
  const equity = balances?.filter(b => b.account_type === 'equity') || []

  const current_assets = assets
    .filter(a => a.account_subtype?.includes('current') || a.account_subtype?.includes('receivable') || a.account_subtype?.includes('inventory'))
    .map(a => ({ code: a.code, name: a.name, balance: a.balance }))

  const fixed_assets = assets
    .filter(a => a.account_subtype?.includes('fixed'))
    .map(a => ({ code: a.code, name: a.name, balance: a.balance }))

  const current_liabilities = liabilities
    .filter(l => l.account_subtype?.includes('current') || l.account_subtype?.includes('payable'))
    .map(l => ({ code: l.code, name: l.name, balance: l.balance }))

  const long_term_liabilities = liabilities
    .filter(l => l.account_subtype?.includes('long_term'))
    .map(l => ({ code: l.code, name: l.name, balance: l.balance }))

  const equity_items = equity.map(e => ({ code: e.code, name: e.name, balance: e.balance }))

  const total_assets = assets.reduce((sum, a) => sum + a.balance, 0)
  const total_liabilities = liabilities.reduce((sum, l) => sum + l.balance, 0)
  const total_equity = equity.reduce((sum, e) => sum + e.balance, 0)

  return {
    assets: {
      current_assets,
      fixed_assets,
      total: total_assets,
    },
    liabilities: {
      current_liabilities,
      long_term_liabilities,
      total: total_liabilities,
    },
    equity: {
      items: equity_items,
      total: total_equity,
    },
    as_of_date,
  }
}

export async function fetchProfitAndLoss(start_date: string, end_date: string): Promise<ProfitAndLossData> {
  const supabase = await createClient()

  // Fetch general ledger entries for the period
  const { data: glEntries, error } = await supabase
    .from('general_ledger')
    .select('*')
    .gte('entry_date', start_date)
    .lte('entry_date', end_date)

  if (error) throw error

  // Group by account
  const accountTotals = new Map<string, { code: string; name: string; type: string; amount: number }>()

  glEntries?.forEach(entry => {
    const key = `${entry.account_code}-${entry.account_name}`
    const existing = accountTotals.get(key) || {
      code: entry.account_code,
      name: entry.account_name,
      type: entry.account_type,
      amount: 0,
    }

    // For revenue/expense, credit increases revenue, debit increases expense
    if (entry.account_type === 'revenue') {
      existing.amount += entry.credit - entry.debit
    } else if (entry.account_type === 'expense') {
      existing.amount += entry.debit - entry.credit
    }

    accountTotals.set(key, existing)
  })

  const accounts = Array.from(accountTotals.values())

  const revenue_items = accounts
    .filter(a => a.type === 'revenue' && !a.code.startsWith('7'))
    .map(a => ({ code: a.code, name: a.name, amount: a.amount }))

  const cogs_items = accounts
    .filter(a => a.type === 'expense' && a.code.startsWith('5'))
    .map(a => ({ code: a.code, name: a.name, amount: a.amount }))

  const operating_expense_items = accounts
    .filter(a => a.type === 'expense' && a.code.startsWith('6'))
    .map(a => ({ code: a.code, name: a.name, amount: a.amount }))

  const other_income_items = accounts
    .filter(a => a.type === 'revenue' && a.code.startsWith('7'))
    .map(a => ({ code: a.code, name: a.name, amount: a.amount }))

  const other_expense_items = accounts
    .filter(a => a.type === 'expense' && a.code.startsWith('7'))
    .map(a => ({ code: a.code, name: a.name, amount: a.amount }))

  const total_revenue = revenue_items.reduce((sum, i) => sum + i.amount, 0)
  const total_cogs = cogs_items.reduce((sum, i) => sum + i.amount, 0)
  const gross_profit = total_revenue - total_cogs
  const gross_margin_pct = total_revenue > 0 ? (gross_profit / total_revenue) * 100 : 0

  const total_operating_expenses = operating_expense_items.reduce((sum, i) => sum + i.amount, 0)
  const operating_income = gross_profit - total_operating_expenses

  const total_other_income = other_income_items.reduce((sum, i) => sum + i.amount, 0)
  const total_other_expenses = other_expense_items.reduce((sum, i) => sum + i.amount, 0)

  const net_income = operating_income + total_other_income - total_other_expenses

  return {
    revenue: { items: revenue_items, total: total_revenue },
    cogs: { items: cogs_items, total: total_cogs },
    gross_profit,
    gross_margin_pct,
    operating_expenses: { items: operating_expense_items, total: total_operating_expenses },
    operating_income,
    other_income: { items: other_income_items, total: total_other_income },
    other_expenses: { items: other_expense_items, total: total_other_expenses },
    net_income,
    period_start: start_date,
    period_end: end_date,
  }
}

export async function fetchCashFlow(start_date: string, end_date: string): Promise<CashFlowData> {
  const supabase = await createClient()

  // Get cash account
  const { data: cashAccount } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('code', '1110')
    .single()

  if (!cashAccount) {
    throw new Error('Cash account not found')
  }

  // Get all transactions affecting cash
  const { data: cashTransactions, error } = await supabase
    .from('general_ledger')
    .select('*')
    .eq('account_code', cashAccount.code)
    .gte('entry_date', start_date)
    .lte('entry_date', end_date)
    .order('entry_date', { ascending: true })

  if (error) throw error

  // Categorize transactions
  const operating: { description: string; amount: number }[] = []
  const investing: { description: string; amount: number }[] = []
  const financing: { description: string; amount: number }[] = []

  cashTransactions?.forEach(tx => {
    const amount = tx.debit - tx.credit
    const item = { description: tx.entry_description || tx.memo || 'Unknown', amount }

    // Categorization logic (simplified)
    if (tx.reference_type === 'payment' || tx.reference_type === 'invoice' || tx.reference_type === 'payroll') {
      operating.push(item)
    } else if (tx.reference_type === 'asset_purchase' || tx.reference_type === 'asset_sale') {
      investing.push(item)
    } else {
      financing.push(item)
    }
  })

  const operating_total = operating.reduce((sum, i) => sum + i.amount, 0)
  const investing_total = investing.reduce((sum, i) => sum + i.amount, 0)
  const financing_total = financing.reduce((sum, i) => sum + i.amount, 0)

  const net_change_in_cash = operating_total + investing_total + financing_total

  // Get beginning cash balance
  const { data: beginningBalance } = await supabase
    .from('general_ledger')
    .select('debit, credit')
    .eq('account_code', cashAccount.code)
    .lt('entry_date', start_date)

  const beginning_cash = beginningBalance?.reduce((sum, tx) => sum + (tx.debit - tx.credit), 0) || 0
  const ending_cash = beginning_cash + net_change_in_cash

  return {
    operating_activities: { items: operating, total: operating_total },
    investing_activities: { items: investing, total: investing_total },
    financing_activities: { items: financing, total: financing_total },
    net_change_in_cash,
    beginning_cash,
    ending_cash,
    period_start: start_date,
    period_end: end_date,
  }
}

export async function fetchDashboardKPIs(): Promise<AccountingDashboardKPIs> {
  const supabase = await createClient()

  // Cash balance
  const { data: cashAccount } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('code', '1110')
    .single()

  // AR total
  const { data: arAccount } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('account_subtype', 'accounts_receivable')
    .single()

  // AP total
  const { data: apAccount } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('account_subtype', 'accounts_payable')
    .single()

  // Current assets and liabilities for ratios
  const { data: currentAssets } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('account_type', 'asset')
    .in('account_subtype', ['current_asset', 'accounts_receivable', 'inventory'])

  const { data: currentLiabilities } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('account_type', 'liability')
    .in('account_subtype', ['current_liability', 'accounts_payable'])

  const total_current_assets = currentAssets?.reduce((sum, a) => sum + a.balance, 0) || 0
  const total_current_liabilities = currentLiabilities?.reduce((sum, l) => sum + l.balance, 0) || 0

  const current_ratio = total_current_liabilities > 0 ? total_current_assets / total_current_liabilities : 0

  // Quick ratio (excluding inventory)
  const { data: quickAssets } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('account_type', 'asset')
    .in('account_subtype', ['current_asset', 'accounts_receivable'])

  const total_quick_assets = quickAssets?.reduce((sum, a) => sum + a.balance, 0) || 0
  const quick_ratio = total_current_liabilities > 0 ? total_quick_assets / total_current_liabilities : 0

  // Net income MTD and YTD
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfYear = new Date(today.getFullYear(), 0, 1)

  const pnlMTD = await fetchProfitAndLoss(startOfMonth.toISOString().split('T')[0], today.toISOString().split('T')[0])
  const pnlYTD = await fetchProfitAndLoss(startOfYear.toISOString().split('T')[0], today.toISOString().split('T')[0])

  return {
    cash_balance: cashAccount?.balance || 0,
    accounts_receivable_total: arAccount?.balance || 0,
    accounts_payable_total: apAccount?.balance || 0,
    current_ratio,
    quick_ratio,
    net_income_mtd: pnlMTD.net_income,
    net_income_ytd: pnlYTD.net_income,
    gross_margin_pct: pnlYTD.gross_margin_pct,
    ar_days_outstanding: 0, // TODO: Calculate
    ap_days_outstanding: 0, // TODO: Calculate
  }
}
