'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import {
  BookOpen,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  Search,
} from 'lucide-react';
import { HelpCenterSection } from '@/components/finance/support/HelpCenterSection';
import { TicketsSection } from '@/components/finance/support/TicketsSection';
import { getSupportStats } from './actions';

type View = 'help' | 'tickets';

export default function FinancialSupportPage() {
  const { profile } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();
  const [activeView, setActiveView] = useState<View>('help');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const role = profile?.role?.toLowerCase() ?? 'ops';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getSupportStats();
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load support stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <header className="mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-semibold text-gray-900">
          <HelpCircle className="h-8 w-8 text-[#174940]" />
          Financial Support
        </h1>
        <p className="text-sm text-gray-600">
          Help center articles and support ticketing for finance questions
        </p>
      </header>

      {/* View Toggle */}
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveView('help')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeView === 'help'
              ? 'bg-[#174940] text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Help Center
        </button>
        <button
          type="button"
          onClick={() => setActiveView('tickets')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeView === 'tickets'
              ? 'bg-[#174940] text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Tickets
          {stats && stats.open > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
              {stats.open}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {activeView === 'help' && <HelpCenterSection showToast={showToast} role={role} />}
        {activeView === 'tickets' && <TicketsSection showToast={showToast} role={role} onStatsChange={loadStats} />}
      </div>
    </div>
  );
}
