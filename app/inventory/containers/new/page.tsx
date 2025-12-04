'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createContainer } from '@/app/actions/containers/createContainer';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AppNav } from '@/components/nav/AppNav';

interface ItemOption {
  id: string;
  name: string;
  sku: string;
  unit_of_measure?: string | null;
}

interface LotOption {
  id: string;
  lot_number: string;
  expiry_date: string | null;
  received_date: string | null;
}

export default function NewContainerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itemId: '',
    lotId: '',
    label: '',
    // NEW WEIGHT MODEL
    grossWeight: '', // Required: bottle + ingredient weight
    intendedNetWeight: '', // Required: supplier's stated ingredient amount
    weightUnit: 'g',
    supplierBarcode: '', // Optional: supplier barcode to link
    location: 'Warehouse',
    status: 'backstock' as 'backstock' | 'active'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (formData.itemId) {
      fetchLots(formData.itemId);
    } else {
      setLots([]);
    }
  }, [formData.itemId]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('item_master')
      .select('id, name, sku, unit_of_measure')
      .order('name');

    if (error) {
      console.error('Error fetching items:', error);
      setItems([]);
      return;
    }

    setItems((data as ItemOption[]) || []);
  };

  const fetchLots = async (itemId: string) => {
    if (!itemId) {
      setLots([]);
      return;
    }

    const { data, error } = await supabase
      .from('item_lots')
      .select('id, lot_number, expiry_date, received_date')
      .eq('item_id', itemId)
      .eq('status', 'active')
      .order('received_date', { ascending: false });

    if (error) {
      console.error('Error fetching lots:', error);
      setLots([]);
      return;
    }

    setLots((data as LotOption[]) || []);
  };

  const handleSubmit = async () => {
    if (!formData.itemId || !formData.lotId || !formData.grossWeight || !formData.intendedNetWeight) return;

    setIsSubmitting(true);
    try {
      const container = await createContainer({
        itemId: formData.itemId,
        lotId: formData.lotId,
        label: formData.label,
        initialGrossWeight: parseFloat(formData.grossWeight),
        intendedNetWeight: parseFloat(formData.intendedNetWeight),
        weightUnit: formData.weightUnit,
        supplierBarcodeValue: formData.supplierBarcode || undefined,
        location: formData.location,
        status: formData.status
      });

      window.open(`/api/labels/container?id=${container.id}`, '_blank');
      router.push('/inventory?tab=containers');
    } catch (error) {
      console.error('Error creating container:', error);
      alert('Error creating container');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-calculate container (tare) weight
  const calculatedTareWeight = formData.grossWeight && formData.intendedNetWeight
    ? (parseFloat(formData.grossWeight) - parseFloat(formData.intendedNetWeight)).toFixed(2)
    : '0.00';

  return (
    <>
      <AppNav currentPage="inventory" />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 gap-2 mb-4"
            >
              ← Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Register New Container</h1>
            <p className="text-gray-600 mt-1">Track physical inventory by weight</p>
          </div>

          {/* Progress Steps - NOW 2 STEPS */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? 'bg-[#174940] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s}
                  </div>
                  {s < 2 && (
                    <div className={`w-32 h-1 mx-4 ${
                      step > s ? 'bg-[#174940]' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-40 mt-2 text-sm">
              <span className={step >= 1 ? 'text-[#174940] font-medium' : 'text-gray-500'}>
                Select Item & Location
              </span>
              <span className={step >= 2 ? 'text-[#174940] font-medium' : 'text-gray-500'}>
                Enter Weights
              </span>
            </div>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Step 1: Identify Ingredient</h2>

              <div className="space-y-4">
                <div>
                  <Label>Item</Label>
                  <Select
                    value={formData.itemId}
                    onChange={(e) => setFormData({ ...formData, itemId: e.target.value, lotId: '' })}
                  >
                    <option value="">Select item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </Select>
                  {items.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      No inventory items available yet. Create one in Inventory → Add Ingredient.
                    </p>
                  )}
                </div>

                <div>
                  <Label>Lot Number</Label>
                  <Select
                    value={formData.lotId}
                    onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}
                    disabled={!formData.itemId}
                    className={!formData.itemId ? 'bg-gray-100' : undefined}
                  >
                    <option value="">Select lot...</option>
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.lot_number} (Exp: {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : 'N/A'})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Container Status</Label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'backstock' | 'active' })}
                  >
                    <option value="backstock">Backstock (Sealed, Warehouse)</option>
                    <option value="active">Active (In Use, Production)</option>
                  </Select>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Warehouse A, Shelf 3"
                  />
                </div>

                <div>
                  <Label>Container Nickname (optional)</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Main Barrel, Working Bottle"
                  />
                </div>

                <Button
                  className="w-full bg-[#174940] hover:bg-[#0f332c]"
                  onClick={() => setStep(2)}
                  disabled={!formData.itemId || !formData.lotId}
                >
                  Next →
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2 - NEW WEIGHT ENTRY */}
          {step === 2 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Step 2: Enter Container Weights</h2>
              <p className="text-gray-600 mb-6">
                Weigh the bottle with the ingredient inside, then enter the weight shown on the supplier's label.
                <br />
                <span className="text-sm italic">No need to empty the container!</span>
              </p>

              <div className="space-y-6">
                {/* Gross Weight Input */}
                <div className="bg-blue-50 p-6 rounded-lg space-y-4">
                  <div>
                    <Label className="text-base font-semibold">1. Total Weight (Bottle + Ingredient)</Label>
                    <p className="text-sm text-gray-600 mb-2">Weigh the bottle with product inside</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.grossWeight}
                        onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                        placeholder="0.00"
                        className="flex-1 text-lg"
                      />
                      <Select
                        value={formData.weightUnit}
                        onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                        className="w-24"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                        <option value="oz">oz</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Intended Net Weight Input */}
                <div className="bg-green-50 p-6 rounded-lg space-y-4">
                  <div>
                    <Label className="text-base font-semibold">2. Ingredient Amount (from Label)</Label>
                    <p className="text-sm text-gray-600 mb-2">What does the supplier's label say is inside?</p>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.intendedNetWeight}
                      onChange={(e) => setFormData({ ...formData, intendedNetWeight: e.target.value })}
                      placeholder="0.00"
                      className="text-lg"
                    />
                  </div>
                </div>

                {/* Calculated Tare Display */}
                {formData.grossWeight && formData.intendedNetWeight && (
                  <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-400">
                    <p className="text-sm text-gray-600 mb-1">Calculated Container Weight:</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {calculatedTareWeight} {formData.weightUnit}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      This is the bottle weight (auto-calculated: {formData.grossWeight} - {formData.intendedNetWeight})
                    </p>
                  </div>
                )}

                {/* Optional: Supplier Barcode */}
                <div className="border-t pt-4">
                  <Label className="text-base">Supplier Barcode (Optional)</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Link the supplier's barcode to track this specific container
                  </p>
                  <Input
                    value={formData.supplierBarcode}
                    onChange={(e) => setFormData({ ...formData, supplierBarcode: e.target.value })}
                    placeholder="Scan or enter supplier barcode"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="px-6"
                >
                  ← Back
                </Button>
                <Button
                  className="flex-1 bg-[#174940] hover:bg-[#0f332c]"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.grossWeight || !formData.intendedNetWeight}
                >
                  {isSubmitting ? 'Creating...' : 'Create Container & Print Label'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
