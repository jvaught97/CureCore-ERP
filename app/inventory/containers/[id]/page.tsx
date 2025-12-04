'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { updateContainerStatus, moveContainerToProduction, moveContainerToBackstock } from '@/app/actions/containers/updateContainerStatus';
import { captureWeight } from '@/app/actions/containers/captureWeight';
import { AppNav } from '@/components/nav/AppNav';
import { Scale, MapPin, Package, History, ArrowRight } from 'lucide-react';

interface ContainerDetail {
  id: string;
  container_code: string;
  label: string | null;
  status: string;
  location: string | null;
  // NEW WEIGHT MODEL
  calculated_tare_weight: number | null;
  refined_tare_weight: number | null;
  initial_gross_weight: number | null;
  intended_net_weight: number | null;
  current_net_weight: number | null;
  current_gross_weight: number | null;
  weight_unit: string;
  last_weighed_at: string | null;
  item_master: {
    name: string;
    sku: string;
    unit_of_measure?: string;
  };
  item_lots: {
    lot_number: string;
    expiry_date: string | null;
    supplier_name?: string | null;
  };
}

interface Measurement {
  id: string;
  gross_weight: number;
  net_weight: number;
  tare_weight: number;
  unit: string;
  measurement_type: string;
  measured_at: string;
  users: {
    full_name: string | null;
  } | null;
}

export default function ContainerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchContainer();
    fetchMeasurements();
  }, [params.id]);

  const fetchContainer = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_containers')
      .select(`
        *,
        item_master!inner(name, sku, unit_of_measure),
        item_lots!inner(lot_number, expiry_date, supplier_name)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching container:', error);
      setContainer(null);
    } else {
      setContainer(data as ContainerDetail);
    }
    setLoading(false);
  };

  const fetchMeasurements = async () => {
    const { data, error } = await supabase
      .from('weight_measurements')
      .select('*, users(full_name)')
      .eq('container_id', params.id)
      .order('measured_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching measurements:', error);
      setMeasurements([]);
      return;
    }

    setMeasurements((data as Measurement[]) || []);
  };

  const handleCaptureWeight = async () => {
    if (!container || !newWeight) return;
    setSaving(true);
    try {
      await captureWeight({
        containerId: params.id,
        grossWeight: parseFloat(newWeight),
        unit: container.weight_unit,
        source: 'manual',
        measurementType: 'inventory_count'
      });

      setNewWeight('');
      fetchContainer();
      fetchMeasurements();
    } catch (error: any) {
      alert(error.message || 'Failed to save measurement');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToProduction = async () => {
    setStatusUpdating(true);
    await moveContainerToProduction(params.id);
    await fetchContainer();
    setStatusUpdating(false);
  };

  const handleMoveToBackstock = async () => {
    setStatusUpdating(true);
    await moveContainerToBackstock(params.id);
    await fetchContainer();
    setStatusUpdating(false);
  };

  const handleArchive = async () => {
    if (!confirm('Archive this container?')) return;
    setStatusUpdating(true);
    await updateContainerStatus(params.id, 'archived');
    await fetchContainer();
    setStatusUpdating(false);
  };

  // Get effective tare weight (refined if available, else calculated)
  const effectiveTareWeight = useMemo(() => {
    if (!container) return 0;
    return container.refined_tare_weight || container.calculated_tare_weight || 0;
  }, [container]);

  const netWeight = useMemo(() => {
    if (!newWeight || !container) return null;
    return (parseFloat(newWeight) - effectiveTareWeight).toFixed(2);
  }, [newWeight, container, effectiveTareWeight]);

  if (loading) return <div>Loading...</div>;
  if (!container) return <div>Container not found</div>;

  return (
    <>
      <AppNav currentPage="inventory" />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/inventory?tab=containers')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            ← Back to Containers
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{container.container_code}</h1>
                    {container.label && (
                      <p className="text-gray-600 mt-1">{container.label}</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      container.status === 'backstock'
                        ? 'bg-green-100 text-green-800'
                        : container.status === 'active'
                        ? 'bg-blue-100 text-blue-800'
                        : container.status === 'quarantine'
                        ? 'bg-yellow-100 text-yellow-800'
                        : container.status === 'empty'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {container.status.charAt(0).toUpperCase() + container.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Item</p>
                    <p className="font-semibold text-gray-900">{container.item_master.name}</p>
                    <p className="text-xs text-gray-500">{container.item_master.sku}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lot Number</p>
                    <p className="font-semibold text-gray-900">{container.item_lots.lot_number}</p>
                    <p className="text-xs text-gray-500">
                      Exp: {container.item_lots.expiry_date ? new Date(container.item_lots.expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {container.location || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Weighed</p>
                    <p className="font-semibold text-gray-900">
                      {container.last_weighed_at
                        ? new Date(container.last_weighed_at).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-6">
                  {container.status === 'backstock' && (
                    <button
                      onClick={handleMoveToProduction}
                      disabled={statusUpdating}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Move to Production
                    </button>
                  )}
                  {container.status === 'active' && (
                    <button
                      onClick={handleMoveToBackstock}
                      disabled={statusUpdating}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Package className="w-4 h-4" />
                      Return to Backstock
                    </button>
                  )}
                  <button
                    onClick={() => window.open(`/api/labels/container?id=${container.id}`, '_blank')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    🖨️ Print Label
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={statusUpdating}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Archive
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Weight History
                </h2>

                <div className="space-y-2">
                  {measurements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {m.net_weight.toFixed(2)} {m.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(m.measured_at).toLocaleString()} by {m.users?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded">
                        {m.measurement_type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}

                  {measurements.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No measurements yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#174940] to-[#0f332c] text-white rounded-lg shadow-lg p-6">
                <p className="text-sm opacity-80 mb-2">Current Net Weight</p>
                <p className="text-5xl font-bold mb-1">
                  {container.current_net_weight?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xl opacity-80">{container.weight_unit}</p>

                <div className="mt-6 pt-6 border-t border-white/20 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-80">Gross Weight (Total):</span>
                    <span className="font-semibold">{container.current_gross_weight?.toFixed(2) || '0.00'} {container.weight_unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Container Weight:</span>
                    <span className="font-semibold">
                      {effectiveTareWeight.toFixed(2)} {container.weight_unit}
                      {container.refined_tare_weight && (
                        <span className="ml-1 text-xs opacity-60">(refined)</span>
                      )}
                    </span>
                  </div>
                  {container.intended_net_weight && (
                    <div className="flex justify-between opacity-70 text-xs border-t border-white/10 pt-2">
                      <span>Original Label Amount:</span>
                      <span>{container.intended_net_weight.toFixed(2)} {container.weight_unit}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Update Weight
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Gross Weight
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="Enter weight..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent"
                    />
                  </div>

                  {netWeight && (
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-600">
                      <p className="text-sm text-gray-600">Net Weight:</p>
                      <p className="text-3xl font-bold text-green-600">
                        {netWeight} {container.weight_unit}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Using {container.refined_tare_weight ? 'refined' : 'calculated'} tare: {effectiveTareWeight.toFixed(2)} {container.weight_unit}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCaptureWeight}
                    disabled={!newWeight || saving}
                    className="w-full bg-[#174940] text-white px-6 py-3 rounded-lg hover:bg-[#0f332c] transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Measurement'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
