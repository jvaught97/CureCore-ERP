'use client'

type UnitSizeFieldsProps = {
  unitPackSizeValue: string
  unitPackSizeUnit: string
  processYieldPct: string
  onUnitPackSizeValueChange: (value: string) => void
  onUnitPackSizeUnitChange: (value: string) => void
  onProcessYieldPctChange: (value: string) => void
  disabled?: boolean
}

const COMMON_UNITS = [
  { value: 'g', label: 'grams (g)' },
  { value: 'mL', label: 'milliliters (mL)' },
  { value: 'oz', label: 'ounces (oz)' },
  { value: 'lb', label: 'pounds (lb)' },
  { value: 'kg', label: 'kilograms (kg)' },
  { value: 'L', label: 'liters (L)' },
]

export function UnitSizeFields({
  unitPackSizeValue,
  unitPackSizeUnit,
  processYieldPct,
  onUnitPackSizeValueChange,
  onUnitPackSizeUnitChange,
  onProcessYieldPctChange,
  disabled = false,
}: UnitSizeFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unit Size
          <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={unitPackSizeValue}
          onChange={(e) => onUnitPackSizeValueChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-[#174940] focus:ring-1 focus:ring-[#174940] disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="50"
          required
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          Size of one finished unit (e.g., 50 for a 50g jar)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unit Type
          <span className="text-red-500">*</span>
        </label>
        <select
          value={unitPackSizeUnit}
          onChange={(e) => onUnitPackSizeUnitChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-[#174940] focus:ring-1 focus:ring-[#174940] disabled:bg-gray-100 disabled:cursor-not-allowed"
          required
          disabled={disabled}
        >
          {COMMON_UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Measurement unit for the finished product
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Process Yield (%)
          <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.1"
          min="1"
          max="100"
          value={processYieldPct}
          onChange={(e) => onProcessYieldPctChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-[#174940] focus:ring-1 focus:ring-[#174940] disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="100"
          required
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          Accounts for manufacturing waste/loss (typically 90-100%)
        </p>
      </div>
    </div>
  )
}
