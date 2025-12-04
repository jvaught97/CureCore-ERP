'use client';

import { BarChart3, FileSpreadsheet, Globe, RefreshCcw, ShieldCheck, TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';

type DashboardTabProps = {
  stats: any;
  onRefresh: () => Promise<void>;
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function DashboardTab({ stats, onRefresh }: DashboardTabProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  // Aggregate monthly data
  const monthlyData = useMemo(() => {
    if (!stats?.recentTransactions) return [];

    const byMonth: Record<string, { taxable: number; tax: number }> = {};

    stats.recentTransactions.forEach((t: any) => {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!byMonth[month]) {
        byMonth[month] = { taxable: 0, tax: 0 };
      }
      byMonth[month].taxable += Number(t.taxable_amount);
      byMonth[month].tax += Number(t.tax_amount);
    });

    return Object.entries(byMonth)
      .map(([month, data]) => ({
        month,
        taxable: data.taxable,
        tax: data.tax,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Tax Overview</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Active Jurisdictions"
          value={stats?.activeJurisdictions || 0}
          icon={<Globe className="h-5 w-5 text-[#174940]" />}
        />
        <KPICard
          label="Open Filings"
          value={stats?.openFilings || 0}
          icon={<FileSpreadsheet className="h-5 w-5 text-amber-500" />}
        />
        <KPICard
          label="Tax Due This Month"
          value={currency.format(stats?.taxDueThisMonth || 0)}
          icon={<TrendingUp className="h-5 w-5 text-red-500" />}
        />
        <KPICard
          label="Exemptions Expiring Soon"
          value={stats?.expiringExemptions || 0}
          icon={<ShieldCheck className="h-5 w-5 text-orange-500" />}
        />
      </div>

      {/* Chart */}
      {monthlyData.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <BarChart3 className="h-5 w-5 text-[#174940]" />
            Tax Collected (Last 6 Months)
          </h3>
          <div className="space-y-3">
            {monthlyData.map(month => {
              const maxTax = Math.max(...monthlyData.map(m => m.tax));
              const widthPercent = maxTax > 0 ? (month.tax / maxTax) * 100 : 0;

              return (
                <div key={month.month} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {new Date(month.month + '-01').toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{currency.format(month.tax)}</div>
                      <div className="text-xs text-gray-500">
                        on {currency.format(month.taxable)} taxable
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-[#174940] transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Filings Placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Filings</h3>
        <p className="text-sm text-gray-500">
          Switch to the <strong>Filings</strong> tab to manage upcoming tax returns
        </p>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
      </div>
      <div className="rounded-full bg-gray-50 p-3 text-gray-500">{icon}</div>
    </div>
  );
}
