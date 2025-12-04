'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import {
  FileSpreadsheet,
  Globe,
  Receipt,
  ShieldCheck,
  Stamp,
  BarChart3,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { DashboardTab } from '@/components/finance/tax/DashboardTab';
import { JurisdictionsTab } from '@/components/finance/tax/JurisdictionsTab';
import { RatesTab } from '@/components/finance/tax/RatesTab';
import { ProductMappingTab } from '@/components/finance/tax/ProductMappingTab';
import { ExemptionsTab } from '@/components/finance/tax/ExemptionsTab';
import { FilingsTab } from '@/components/finance/tax/FilingsTab';
import { getTaxDashboardStats } from './actions';

type Tab = 'dashboard' | 'jurisdictions' | 'rates' | 'mapping' | 'exemptions' | 'filings';

export default function TaxManagementPage() {
  const { profile } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const role = profile?.role?.toLowerCase() ?? 'ops';
  const hasFinanceAccess = role === 'admin' || role === 'finance';

  useEffect(() => {
    if (!hasFinanceAccess) return;
    loadStats();
  }, [hasFinanceAccess]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getTaxDashboardStats();
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load tax stats:', error);
      showToast(error?.message || 'Failed to load tax dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!hasFinanceAccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-gray-600">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-semibold text-gray-900">Admins Only</h1>
        <p className="text-sm text-gray-500">Tax management is restricted to finance or admin users.</p>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'jurisdictions', label: 'Jurisdictions', icon: <Globe className="h-4 w-4" /> },
    { key: 'rates', label: 'Rates & Categories', icon: <Receipt className="h-4 w-4" /> },
    { key: 'mapping', label: 'Product Mapping', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { key: 'exemptions', label: 'Exemptions', icon: <ShieldCheck className="h-4 w-4" /> },
    { key: 'filings', label: 'Filings', icon: <Stamp className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <header className="mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-semibold text-gray-900">
          <Receipt className="h-8 w-8 text-[#174940]" />
          Tax Management
        </h1>
        <p className="text-sm text-gray-600">
          Manage tax jurisdictions, rates, exemptions, and filing compliance
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-200 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-[#174940] bg-white text-[#174940]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading && activeTab === 'dashboard' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading tax dashboard...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab stats={stats} onRefresh={loadStats} />}
            {activeTab === 'jurisdictions' && <JurisdictionsTab showToast={showToast} />}
            {activeTab === 'rates' && <RatesTab showToast={showToast} />}
            {activeTab === 'mapping' && <ProductMappingTab showToast={showToast} />}
            {activeTab === 'exemptions' && <ExemptionsTab showToast={showToast} />}
            {activeTab === 'filings' && <FilingsTab showToast={showToast} />}
          </>
        )}
      </div>
    </div>
  );
}
