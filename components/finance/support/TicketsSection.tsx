'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Plus } from 'lucide-react';
import { listTickets, createTicket } from '@/app/(finance)/finance/support/actions';

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
};

type TicketsSectionProps = {
  showToast: (message: string, type: 'success' | 'error') => void;
  role: string;
  onStatsChange: () => void;
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
};

const statusColors = {
  open: 'bg-green-50 text-green-700',
  in_progress: 'bg-blue-50 text-blue-700',
  waiting: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-purple-50 text-purple-700',
  closed: 'bg-gray-100 text-gray-600',
};

export function TicketsSection({ showToast, role, onStatsChange }: TicketsSectionProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await listTickets(filterStatus ? { status: filterStatus as any } : {});
      setTickets(data);
      onStatsChange();
    } catch (error: any) {
      showToast(error.message || 'Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (data: any) => {
    try {
      await createTicket(data);
      showToast('Ticket created', 'success');
      setShowNewTicket(false);
      await loadTickets();
    } catch (error: any) {
      showToast(error.message || 'Failed to create ticket', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'open', 'in_progress', 'resolved', 'closed'].map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                filterStatus === status
                  ? 'bg-[#174940] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowNewTicket(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830]"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {showNewTicket && (
        <NewTicketForm onSubmit={handleCreateTicket} onCancel={() => setShowNewTicket(false)} />
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Subject
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{ticket.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{ticket.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        priorityColors[ticket.priority as keyof typeof priorityColors]
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[ticket.status as keyof typeof statusColors]
                      }`}
                    >
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewTicketForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    subject: '',
    category: 'Other' as any,
    priority: 'normal' as any,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(formData);
    setSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <h3 className="mb-4 font-semibold text-gray-900">New Support Ticket</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject *</label>
          <input
            type="text"
            required
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as any })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
            >
              {['AR', 'AP', 'Tax', 'Reconciliation', 'Reporting', 'Other'].map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
            >
              {['low', 'normal', 'high', 'urgent'].map(pri => (
                <option key={pri} value={pri}>
                  {pri}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create Ticket
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
