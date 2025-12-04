'use client';

import { useState } from 'react';
import { Calculator, TrendingUp, Users, Package, DollarSign, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calculateROI, roiDefaults } from '@/data/roi';
import { formatCurrency, formatNumber } from '@/lib/calc';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { chartColors } from '@/data/demoData';

export function ROICalculator() {
  const [inputs, setInputs] = useState({
    opsTeamSize: roiDefaults.opsTeamSize,
    salesTeamSize: roiDefaults.salesTeamSize,
    financeTeamSize: roiDefaults.financeTeamSize,
    batchesPerMonth: roiDefaults.batchesPerMonth,
    quotesPerMonth: roiDefaults.quotesPerMonth,
    manualHoursPerWeek: roiDefaults.manualHoursPerWeek,
    errorRatePct: roiDefaults.errorRatePct,
    planPrice: 599, // Default to Scale plan
  });

  const [showResults, setShowResults] = useState(false);

  const handleChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  const results = calculateROI(inputs);

  // Data for 3-year projection
  const projectionData = [
    { year: 'Year 1', savings: results.totalAnnualSavings, cost: results.annualCost, net: results.netAnnualBenefit },
    { year: 'Year 2', savings: results.totalAnnualSavings * 2, cost: results.annualCost * 2, net: results.netAnnualBenefit * 2 },
    { year: 'Year 3', savings: results.totalAnnualSavings * 3, cost: results.annualCost * 3, net: results.netAnnualBenefit * 3 },
  ];

  const savingsBreakdownData = [
    { category: 'Labor Savings', amount: results.laborSavings },
    { category: 'Error Reduction', amount: results.errorSavings },
  ];

  return (
    <div className="space-y-8">
      {/* Input Form */}
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[#174940]" />
          <h3 className="text-xl font-bold">Your Team & Operations</h3>
        </div>

        <div className="space-y-6">
          {/* Team Size */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Team Size</Label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="opsTeamSize" className="text-sm">Operations Team</Label>
                <Input
                  id="opsTeamSize"
                  type="number"
                  value={inputs.opsTeamSize}
                  onChange={(e) => handleChange('opsTeamSize', e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="salesTeamSize" className="text-sm">Sales Team</Label>
                <Input
                  id="salesTeamSize"
                  type="number"
                  value={inputs.salesTeamSize}
                  onChange={(e) => handleChange('salesTeamSize', e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="financeTeamSize" className="text-sm">Finance Team</Label>
                <Input
                  id="financeTeamSize"
                  type="number"
                  value={inputs.financeTeamSize}
                  onChange={(e) => handleChange('financeTeamSize', e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Volume Metrics */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Monthly Volume</Label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="batchesPerMonth" className="text-sm">Batches Per Month</Label>
                <Input
                  id="batchesPerMonth"
                  type="number"
                  value={inputs.batchesPerMonth}
                  onChange={(e) => handleChange('batchesPerMonth', e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="quotesPerMonth" className="text-sm">Quotes Per Month</Label>
                <Input
                  id="quotesPerMonth"
                  type="number"
                  value={inputs.quotesPerMonth}
                  onChange={(e) => handleChange('quotesPerMonth', e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Current State */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Current Manual Process</Label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="manualHoursPerWeek" className="text-sm">Manual Hours/Week (entire team)</Label>
                <Input
                  id="manualHoursPerWeek"
                  type="number"
                  value={inputs.manualHoursPerWeek}
                  onChange={(e) => handleChange('manualHoursPerWeek', e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="errorRatePct" className="text-sm">Error Rate %</Label>
                <Input
                  id="errorRatePct"
                  type="number"
                  value={inputs.errorRatePct}
                  onChange={(e) => handleChange('errorRatePct', e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">CureCore Plan</Label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { name: 'Launchpad', price: 299 },
                { name: 'Scale', price: 599 },
                { name: 'Enterprise', price: 999 },
              ].map((plan) => (
                <button
                  key={plan.name}
                  onClick={() => handleChange('planPrice', plan.price.toString())}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    inputs.planPrice === plan.price
                      ? 'border-[#174940] bg-[#174940]/5'
                      : 'border-border hover:border-[#174940]/30'
                  }`}
                >
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-sm text-muted-foreground">${plan.price}/mo</div>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            className="w-full bg-[#174940] hover:bg-[#174940]/90"
            size="lg"
          >
            Calculate ROI
          </Button>
        </div>
      </Card>

      {/* Results */}
      {showResults && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">ROI</div>
              <div className="mt-1 text-3xl font-bold text-green-600">
                {results.roi}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Annual return
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Payback Period</div>
              <div className="mt-1 text-3xl font-bold text-[#174940]">
                {results.paybackMonths}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Months to break even
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Annual Savings</div>
              <div className="mt-1 text-3xl font-bold text-[#174940]">
                {formatCurrency(results.totalAnnualSavings)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Total value delivered
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">3-Year Value</div>
              <div className="mt-1 text-3xl font-bold text-[#174940]">
                {formatCurrency(results.threeYearValue)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Net benefit over 3 years
              </div>
            </Card>
          </div>

          {/* Time Savings */}
          <Card className="p-6">
            <h4 className="mb-4 text-lg font-semibold">Time Saved</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Weekly Hours Saved</div>
                <div className="text-4xl font-bold text-[#174940]">{results.weeklyHoursSaved}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatNumber(results.annualHoursSaved)} hours/year
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Labor Cost Savings</div>
                <div className="text-4xl font-bold text-green-600">{formatCurrency(results.laborSavings)}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Per year at $35/hour average
                </div>
              </div>
            </div>
          </Card>

          {/* Savings Breakdown */}
          <Card className="p-6">
            <h4 className="mb-4 text-lg font-semibold">Savings Breakdown</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={savingsBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" fill={chartColors.primary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* 3-Year Projection */}
          <Card className="p-6">
            <h4 className="mb-4 text-lg font-semibold">3-Year Projection</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="savings" stroke={chartColors.success} strokeWidth={2} name="Total Savings" />
                <Line type="monotone" dataKey="cost" stroke={chartColors.danger} strokeWidth={2} name="CureCore Cost" />
                <Line type="monotone" dataKey="net" stroke={chartColors.primary} strokeWidth={3} name="Net Benefit" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* CTA */}
          <Card className="border-[#174940] bg-[#174940]/5 p-6">
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
              <TrendingUp className="h-12 w-12 flex-shrink-0 text-[#174940]" />
              <div className="flex-1">
                <h4 className="mb-2 text-lg font-bold">Ready to unlock {formatCurrency(results.totalAnnualSavings)}/year in savings?</h4>
                <p className="text-sm text-muted-foreground">
                  Start your 14-day free trial and see these results in your own business.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="bg-[#174940] hover:bg-[#174940]/90">
                  <a href="/app/signup">Start Free Trial</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/contact">Request Demo</a>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
