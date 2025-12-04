import { Metadata } from 'next';
import { CTASection } from '@/components/marketing/CTASection';
import { Card } from '@/components/ui/card';
import { TrendingUp, Target, DollarSign, Receipt, Landmark, Calculator, Calendar, FileText, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Finance & Accounting - CureCore SMOS',
  description: 'Complete financial suite: P&L, budgets, AR/AP, payroll, bank reconciliation, tax, and reporting.',
};

const financeModules = [
  {
    icon: TrendingUp,
    title: 'P&L (Profit & Loss)',
    desc: 'Real-time profit and loss by period, department, and product line.',
    features: ['Automatic cost allocation', 'Period comparisons', 'Drill-down reporting', 'Export to Excel'],
    timeSaved: '4 hrs/week',
  },
  {
    icon: Target,
    title: 'Budgeting',
    desc: 'Create budgets, track variance, and forecast future performance.',
    features: ['Department budgets', 'Variance alerts', 'Rolling forecasts', 'What-if scenarios'],
    timeSaved: '5 hrs/week',
  },
  {
    icon: DollarSign,
    title: 'Payroll Allocation',
    desc: 'Allocate labor costs to batches, departments, and projects.',
    features: ['Batch costing', 'Cost center allocation', 'Overtime tracking', 'Labor reports'],
    timeSaved: '3 hrs/week',
  },
  {
    icon: FileText,
    title: 'Chart of Accounts & Journal Entries',
    desc: 'Full double-entry accounting with custom GL codes and journal entries.',
    features: ['Custom GL structure', 'Journal entries', 'Account reconciliation', 'Audit trail'],
    timeSaved: '4 hrs/week',
  },
  {
    icon: Receipt,
    title: 'AR/AP (Accounts Receivable & Payable)',
    desc: 'Manage invoices, bills, payments, and aging reports.',
    features: ['Invoice generation', 'Payment tracking', 'Aging reports', 'Late payment reminders'],
    timeSaved: '6 hrs/week',
  },
  {
    icon: Landmark,
    title: 'Bank Reconciliation',
    desc: 'Import bank statements, match transactions, and reconcile accounts.',
    features: ['Statement import', 'Auto-matching rules', 'Discrepancy alerts', 'Reconciliation reports'],
    timeSaved: '4 hrs/week',
  },
  {
    icon: Calendar,
    title: 'Tax Management',
    desc: 'Track sales tax, income tax, and filing deadlines by jurisdiction.',
    features: ['Multi-jurisdiction support', 'Tax rate management', 'Filing reminders', 'Tax reports'],
    timeSaved: '2 hrs/week',
  },
  {
    icon: FileText,
    title: 'Financial Reports',
    desc: 'Generate P&L, Balance Sheet, Cash Flow, and custom reports.',
    features: ['Standard reports', 'Custom report builder', 'Scheduled delivery', 'Export to PDF/Excel'],
    timeSaved: '3 hrs/week',
  },
];

export default function FinancePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Close the Loop with
            <br />
            <span className="text-[#174940]">Financial Intelligence</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            CureCore connects your manufacturing costs directly to your P&L. See real-time profitability,
            manage cash flow, and close the books faster—without juggling multiple tools.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Check className="h-5 w-5 text-green-500" />
            <span>Saves 15-25 hours/week for finance teams</span>
          </div>
        </div>
      </section>

      {/* Financial Modules */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Complete Financial Suite
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Everything you need to manage your finances in one integrated platform
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {financeModules.map((module, i) => (
              <Card key={i} className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <module.icon className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 font-bold">{module.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{module.desc}</p>
                <div className="mb-3 text-xs font-medium text-green-600">
                  Saves {module.timeSaved}
                </div>
                <ul className="space-y-1 text-xs">
                  {module.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-[#174940]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Connected to Manufacturing */}
      <section className="border-b bg-muted/30 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              The Power of Integration
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Unlike standalone accounting software, CureCore knows your manufacturing costs in real-time
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 text-xl font-bold">Traditional Accounting Software</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span>Manual data entry from production spreadsheets</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span>Month-end cost reconciliation takes days</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span>No connection between batches and COGS</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span>P&L is always 2-4 weeks behind reality</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span>Can't drill down from revenue to specific batches</span>
                </div>
              </div>
            </Card>

            <Card className="border-2 border-[#174940] p-6">
              <h3 className="mb-4 text-xl font-bold text-[#174940]">CureCore SMOS</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Costs flow automatically from batches to P&L</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Real-time COGS and gross margin by product</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Drill from P&L to batch to ingredient to vendor</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Close books in hours, not days</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Make pricing decisions based on actual costs</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Example P&L */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Example: Live P&L
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              See profit and loss in real-time, drill down to any level of detail
            </p>
          </div>

          <Card className="mx-auto max-w-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">P&L Statement</h3>
              <div className="text-sm text-muted-foreground">YTD 2025</div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2 font-semibold">
                <span>Revenue</span>
                <span className="text-[#174940]">$487,200</span>
              </div>

              <div className="pl-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Product Sales</span>
                  <span>$467,200</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Other Revenue</span>
                  <span>$20,000</span>
                </div>
              </div>

              <div className="flex justify-between border-b pb-2 font-semibold">
                <span>Cost of Goods Sold</span>
                <span className="text-red-600">($195,000)</span>
              </div>

              <div className="pl-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Materials</span>
                  <span>$98,400</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Labor</span>
                  <span>$56,200</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Overhead</span>
                  <span>$40,400</span>
                </div>
              </div>

              <div className="flex justify-between border-b pb-2 font-semibold">
                <span>Gross Profit</span>
                <span className="text-green-600">$292,200</span>
              </div>
              <div className="flex justify-between pl-4 text-xs text-muted-foreground">
                <span>Gross Margin</span>
                <span>60%</span>
              </div>

              <div className="flex justify-between border-b pb-2 font-semibold">
                <span>Operating Expenses</span>
                <span className="text-red-600">($156,000)</span>
              </div>

              <div className="pl-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sales & Marketing</span>
                  <span>$67,000</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>R&D</span>
                  <span>$45,000</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>General & Admin</span>
                  <span>$44,000</span>
                </div>
              </div>

              <div className="flex justify-between border-t-2 pt-3 text-base font-bold">
                <span>Net Income</span>
                <span className="text-[#174940]">$136,200</span>
              </div>
              <div className="flex justify-between pl-4 text-xs text-muted-foreground">
                <span>Net Margin</span>
                <span>28%</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <CTASection
        title="Ready to Get Financial Clarity?"
        description="Connect your operations to your P&L and see the full picture in real-time."
      />
    </>
  );
}
