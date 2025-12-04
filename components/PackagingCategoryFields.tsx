'use client';

import React from 'react';
import {
  PackagingCategory,
  LABEL_SIZES,
  FINISH_OPTIONS,
  BOTTLE_CAPACITIES,
  NECK_SIZES,
  CLOSURE_TYPES,
  LINER_TYPES,
  COLOR_OPTIONS,
  BOX_DIMENSION_PRESETS,
  WEIGHT_CAPACITY_OPTIONS,
  MATERIALS_BY_CATEGORY,
} from '@/lib/packaging-constants';

interface PackagingCategoryFieldsProps {
  category: string;
  values: {
    label_size?: string;
    finish?: string;
    capacity?: string;
    neck_size?: string;
    color?: string;
    closure_type?: string;
    liner_type?: string;
    dimensions?: string;
    weight_capacity?: string;
    material?: string;
  };
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

export default function PackagingCategoryFields({
  category,
  values,
  onChange,
  disabled = false,
}: PackagingCategoryFieldsProps) {
  const renderLabelFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label Size
        </label>
        <select
          value={values.label_size || ''}
          onChange={(e) => onChange('label_size', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select size...</option>
          {LABEL_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Finish
        </label>
        <select
          value={values.finish || ''}
          onChange={(e) => onChange('finish', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select finish...</option>
          {FINISH_OPTIONS.map((finish) => (
            <option key={finish.value} value={finish.value}>
              {finish.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material
        </label>
        <select
          value={values.material || ''}
          onChange={(e) => onChange('material', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select material...</option>
          {MATERIALS_BY_CATEGORY.Labels.map((material) => (
            <option key={material.value} value={material.value}>
              {material.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderBottleFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capacity
        </label>
        <select
          value={values.capacity || ''}
          onChange={(e) => onChange('capacity', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select capacity...</option>
          {BOTTLE_CAPACITIES.map((capacity) => (
            <option key={capacity.value} value={capacity.value}>
              {capacity.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Neck Size
        </label>
        <select
          value={values.neck_size || ''}
          onChange={(e) => onChange('neck_size', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select neck size...</option>
          {NECK_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material
        </label>
        <select
          value={values.material || ''}
          onChange={(e) => onChange('material', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select material...</option>
          {MATERIALS_BY_CATEGORY.Bottles.map((material) => (
            <option key={material.value} value={material.value}>
              {material.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color
        </label>
        <select
          value={values.color || ''}
          onChange={(e) => onChange('color', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select color...</option>
          {COLOR_OPTIONS.map((color) => (
            <option key={color.value} value={color.value}>
              {color.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderCapFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Closure Type
        </label>
        <select
          value={values.closure_type || ''}
          onChange={(e) => onChange('closure_type', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select closure type...</option>
          {CLOSURE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Liner Type
        </label>
        <select
          value={values.liner_type || ''}
          onChange={(e) => onChange('liner_type', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select liner type...</option>
          {LINER_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color
        </label>
        <select
          value={values.color || ''}
          onChange={(e) => onChange('color', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select color...</option>
          {COLOR_OPTIONS.map((color) => (
            <option key={color.value} value={color.value}>
              {color.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material
        </label>
        <select
          value={values.material || ''}
          onChange={(e) => onChange('material', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select material...</option>
          {MATERIALS_BY_CATEGORY.Caps.map((material) => (
            <option key={material.value} value={material.value}>
              {material.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderBoxFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dimensions (L x W x H)
        </label>
        <select
          value={values.dimensions || ''}
          onChange={(e) => onChange('dimensions', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select dimensions...</option>
          {BOX_DIMENSION_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Weight Capacity
        </label>
        <select
          value={values.weight_capacity || ''}
          onChange={(e) => onChange('weight_capacity', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select weight capacity...</option>
          {WEIGHT_CAPACITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material
        </label>
        <select
          value={values.material || ''}
          onChange={(e) => onChange('material', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select material...</option>
          {MATERIALS_BY_CATEGORY.Boxes.map((material) => (
            <option key={material.value} value={material.value}>
              {material.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderSealsFields = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Material
      </label>
      <select
        value={values.material || ''}
        onChange={(e) => onChange('material', e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="">Select material...</option>
        {MATERIALS_BY_CATEGORY.Seals.map((material) => (
          <option key={material.value} value={material.value}>
            {material.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderOtherFields = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Material
      </label>
      <select
        value={values.material || ''}
        onChange={(e) => onChange('material', e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="">Select material...</option>
        {MATERIALS_BY_CATEGORY.Other.map((material) => (
          <option key={material.value} value={material.value}>
            {material.label}
          </option>
        ))}
      </select>
    </div>
  );

  // Return appropriate fields based on category
  const renderFields = () => {
    switch (category) {
      case 'Labels':
        return renderLabelFields();
      case 'Bottles':
        return renderBottleFields();
      case 'Caps':
        return renderCapFields();
      case 'Boxes':
        return renderBoxFields();
      case 'Seals':
        return renderSealsFields();
      case 'Other':
        return renderOtherFields();
      default:
        return null;
    }
  };

  const fields = renderFields();

  if (!fields) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-blue-900 mb-3">
        {category} Specifications
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fields}</div>
    </div>
  );
}
