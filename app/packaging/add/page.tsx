'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { ArrowLeft, Save } from 'lucide-react';
import { AppNav } from '@/components/nav/AppNav';
import PackagingCategoryFields from '@/components/PackagingCategoryFields';
import PackagingFileUpload from '@/components/PackagingFileUpload';

export default function AddPackagingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    on_hand: 0,
    unit: 'units',
    reorder_point: 0,
    cost_per_unit: 0,
    status: 'active',
    // Category-specific fields
    label_size: '',
    finish: '',
    capacity: '',
    neck_size: '',
    color: '',
    closure_type: '',
    liner_type: '',
    dimensions: '',
    weight_capacity: '',
    material: '',
  });

  const [saving, setSaving] = useState(false);
  const [savedPackagingId, setSavedPackagingId] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const handleCategoryFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('packaging')
        .insert([formData])
        .select()
        .single();

      if (error) {
        console.error('Error adding packaging:', error);
        alert('Error adding packaging: ' + error.message);
        return;
      }

      setSavedPackagingId(data.id);
      setShowFileUpload(true);
      alert('Packaging added successfully! You can now upload files.');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while adding the packaging.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    router.push('/inventory?tab=packaging');
  };

  return (
    <>
      <AppNav currentPage="inventory" />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.push('/inventory')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Inventory
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Add New Packaging</h1>
            <p className="text-gray-600 mt-1">Enter packaging details to add to inventory</p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Packaging Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent text-gray-900"
                    placeholder="e.g., 30ml Amber Bottle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent text-gray-900"
                  >
                    <option value="">Select category...</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Caps">Caps</option>
                    <option value="Labels">Labels</option>
                    <option value="Seals">Seals</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Inventory Details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    On Hand Quantity *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formData.on_hand}
                    onChange={(e) => setFormData({ ...formData, on_hand: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Unit *
                  </label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent text-gray-900"
                  >
                    <option value="units">Units</option>
                    <option value="boxes">Boxes</option>
                    <option value="cases">Cases</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent text-gray-900"
                    placeholder="Low stock alert level"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cost per Unit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent text-gray-900"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category-Specific Fields */}
            {formData.category && (
              <div>
                <PackagingCategoryFields
                  category={formData.category}
                  values={formData}
                  onChange={handleCategoryFieldChange}
                  disabled={saving || showFileUpload}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/inventory')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || showFileUpload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#174940] text-white rounded-lg font-medium hover:bg-[#0f332c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Packaging'}
              </button>
            </div>
          </form>

          {/* File Upload Section (shown after packaging is saved) */}
          {showFileUpload && savedPackagingId && (
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Files (Optional)
              </h2>
              <p className="text-gray-600 mb-4">
                Add label designs, artwork, specification sheets, or other files for this packaging item.
              </p>
              <PackagingFileUpload
                packagingId={savedPackagingId}
                onUploadComplete={() => {
                  // Optionally refresh or show success message
                }}
              />
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleFinish}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Finish & Return to Inventory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
