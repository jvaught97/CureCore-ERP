'use client';

import { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calcUnitCost, calcBreakEven, formatCurrency, formatPercent } from '@/lib/calc';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { chartColors } from '@/data/demoData';

export function PrelaunchCostEstimator() {
  const [inputs, setInputs] = useState({
    ingredientsCost: 120,
    packagingCost: 80,
    laborRate: 25,
    laborHours: 4,
    overheadPct: 0.25,
    wastePct: 0.05,
    batchQty: 100,
    fixedCosts: 5000,
  });

  const [showResults, setShowResults] = useState(false);

  const handleChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  const costResults = calcUnitCost({
    ingredientsCost: inputs.ingredientsCost,
    packagingCost: inputs.packagingCost,
    laborRate: inputs.laborRate,
    laborHours: inputs.laborHours,
    overheadPct: inputs.overheadPct,
    wastePct: inputs.wastePct,
    batchQty: inputs.batchQty,
  });

  const breakEvenResults = calcBreakEven({
    fixedCosts: inputs.fixedCosts,
    unitCost: costResults.unitCost,
    sellingPrice: costResults.targetMSRP,
  });

  // Data for cost breakdown chart
  const breakdownData = [
    { name: 'Materials', value: costResults.breakdown.materials },
    { name: 'Labor', value: costResults.breakdown.labor },
    { name: 'Overhead', value: costResults.breakdown.overhead },
    { name: 'Waste', value: costResults.breakdown.waste },
  ];

  const pieData = [
    { name: 'Materials', value: costResults.breakdown.materials },
    { name: 'Labor', value: costResults.breakdown.labor },
    { name: 'Overhead', value: costResults.breakdown.overhead },
    { name: 'Waste', value: costResults.breakdown.waste },
  ];

  const COLORS = [chartColors.primary, chartColors.secondary, chartColors.accent, chartColors.warning];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Input Form */}
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[#174940]" />
          <h3 className="text-xl font-bold">Batch Cost Inputs</h3>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ingredientsCost">Ingredients Cost ($)</Label>
              <Input
                id="ingredientsCost"
                type="number"
                value={inputs.ingredientsCost}
                onChange={(e) => handleChange('ingredientsCost', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="packagingCost">Packaging Cost ($)</Label>
              <Input
                id="packagingCost"
                type="number"
                value={inputs.packagingCost}
                onChange={(e) => handleChange('packagingCost', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="laborRate">Labor Rate ($/hr)</Label>
              <Input
                id="laborRate"
                type="number"
                value={inputs.laborRate}
                onChange={(e) => handleChange('laborRate', e.target.value)}
                min="0"
                step="0.5"
              />
            </div>
            <div>
              <Label htmlFor="laborHours">Labor Hours</Label>
              <Input
                id="laborHours"
                type="number"
                value={inputs.laborHours}
                onChange={(e) => handleChange('laborHours', e.target.value)}
                min="0"
                step="0.25"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="overheadPct">Overhead % (0-100)</Label>
              <Input
                id="overheadPct"
                type="number"
                value={inputs.overheadPct * 100}
                onChange={(e) => handleChange('overheadPct', (parseFloat(e.target.value) || 0) / 100)}
                min="0"
                max="100"
                step="1"
              />
            </div>
            <div>
              <Label htmlFor="wastePct">Waste % (0-100)</Label>
              <Input
                id="wastePct"
                type="number"
                value={inputs.wastePct * 100}
                onChange={(e) => handleChange('wastePct', (parseFloat(e.target.value) || 0) / 100)}
                min="0"
                max="100"
                step="1"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="batchQty">Batch Quantity (units)</Label>
              <Input
                id="batchQty"
                type="number"
                value={inputs.batchQty}
                onChange={(e) => handleChange('batchQty', e.target.value)}
                min="1"
                step="1"
              />
            </div>
            <div>
              <Label htmlFor="fixedCosts">Monthly Fixed Costs ($)</Label>
              <Input
                id="fixedCosts"
                type="number"
                value={inputs.fixedCosts}
                onChange={(e) => handleChange('fixedCosts', e.target.value)}
                min="0"
                step="100"
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            className="w-full bg-[#174940] hover:bg-[#174940]/90"
          >
            Calculate Costs
          </Button>
        </div>
      </Card>

      {/* Results */}
      {showResults && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Unit Cost</div>
              <div className="mt-1 text-3xl font-bold text-[#174940]">
                {formatCurrency(costResults.unitCost)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Per unit manufactured
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Target MSRP (4x)</div>
              <div className="mt-1 text-3xl font-bold text-[#174940]">
                {formatCurrency(costResults.targetMSRP)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatPercent(costResults.grossMargin)} gross margin
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#174940]" />
              <div className="text-sm font-semibold">Breakeven Analysis</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Breakeven Units</div>
                <div className="text-2xl font-bold">{breakEvenResults.breakEvenUnits}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Breakeven Revenue</div>
                <div className="text-2xl font-bold">{formatCurrency(breakEvenResults.breakEvenRevenue)}</div>
              </div>
            </div>
          </Card>

          {/* Cost Breakdown Chart */}
          <Card className="p-4">
            <h4 className="mb-4 font-semibold">Cost Breakdown</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}
