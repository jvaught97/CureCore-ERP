'use client';

import { useEffect, useState } from 'react';
import { Globe, Loader2, Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  listJurisdictions,
  createOrUpdateJurisdiction,
  toggleJurisdiction,
} from '@/app/(finance)/finance/tax/actions';

type Jurisdiction = {
  id: string;
  code: string;
  name: string;
  country: string;
  nexus_start: string | null;
  active: boolean;
};

type JurisdictionsTabProps = {
  showToast: (message: string, type: 'success' | 'error') => void;
};

export function JurisdictionsTab({ showToast }: JurisdictionsTabProps) {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Jurisdiction | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadJurisdictions();
  }, []);

  const loadJurisdictions = async () => {
    try {
      setLoading(true);
      const data = await listJurisdictions();
      setJurisdictions(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to load jurisdictions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      await createOrUpdateJurisdiction(data);
      showToast('Jurisdiction saved', 'success');
      setShowForm(false);
      setEditing(null);
      await loadJurisdictions();
    } catch (error: any) {
      showToast(error.message || 'Failed to save jurisdiction', 'error');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleJurisdiction(id, !active);
      showToast('Jurisdiction updated', 'success');
      await loadJurisdictions();
    } catch (error: any) {
      showToast(error.message || 'Failed to toggle jurisdiction', 'error');
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tax Jurisdictions</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830]"
        >
          <Plus className="h-4 w-4" />
          Add Jurisdiction
        </button>
      </div>

      {showForm && (
        <JurisdictionForm
          jurisdiction={editing}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Country
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Nexus Start
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {jurisdictions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No jurisdictions configured. Add one to get started.
                </td>
              </tr>
            ) : (
              jurisdictions.map(jurisdiction => (
                <tr key={jurisdiction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{jurisdiction.code}</td>
                  <td className="px-4 py-3 text-gray-700">{jurisdiction.name}</td>
                  <td className="px-4 py-3 text-gray-600">{jurisdiction.country}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {jurisdiction.nexus_start
                      ? new Date(jurisdiction.nexus_start).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        jurisdiction.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {jurisdiction.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(jurisdiction);
                          setShowForm(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940]"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(jurisdiction.id, jurisdiction.active)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940]"
                      >
                        {jurisdiction.active ? (
                          <ToggleRight className="h-3 w-3" />
                        ) : (
                          <ToggleLeft className="h-3 w-3" />
                        )}
                        {jurisdiction.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
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

function JurisdictionForm({
  jurisdiction,
  onSave,
  onCancel,
}: {
  jurisdiction: Jurisdiction | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    id: jurisdiction?.id,
    code: jurisdiction?.code || '',
    name: jurisdiction?.name || '',
    country: jurisdiction?.country || 'US',
    nexusStart: jurisdiction?.nexus_start || '',
    active: jurisdiction?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-4 font-semibold text-gray-900">
        {jurisdiction ? 'Edit Jurisdiction' : 'New Jurisdiction'}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Code *</label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
            placeholder="US-OK"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
            placeholder="Oklahoma"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <input
            type="text"
            value={formData.country}
            onChange={e => setFormData({ ...formData, country: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nexus Start Date</label>
          <input
            type="date"
            value={formData.nexusStart}
            onChange={e => setFormData({ ...formData, nexusStart: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.active}
            onChange={e => setFormData({ ...formData, active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
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
