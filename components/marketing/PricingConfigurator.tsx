'use client';

import { useState } from 'react';
import { Check, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { modules, addOns, type ModulePillar } from '@/data/pricing';
import { formatCurrency } from '@/lib/calc';

const pillarLabels: Record<ModulePillar, string> = {
  operations: 'Operations',
  commercial: 'Commercial',
  financial: 'Financial',
};

const pillarColors: Record<ModulePillar, string> = {
  operations: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  commercial: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  financial: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

export function PricingConfigurator() {
  const [selectedModules, setSelectedModules] = useState<string[]>(['inventory', 'formulations', 'batches']);
  const [seats, setSeats] = useState(5);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns(prev =>
      prev.includes(addOnId)
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  // Calculate pricing
  const basePrice = 199;
  const pricePerModule = 49;
  const pricePerSeat = 25;
  const modulePrice = selectedModules.length * pricePerModule;
  const seatPrice = Math.max(0, seats - 3) * pricePerSeat; // First 3 seats included
  const addOnPrice = selectedAddOns.reduce((sum, id) => {
    const addOn = addOns.find(a => a.id === id);
    if (!addOn) return sum;
    const price = parseInt(addOn.price.match(/\$(\d+)/)?.[1] || '0');
    return sum + price;
  }, 0);

  const totalMonthly = basePrice + modulePrice + seatPrice + addOnPrice;

  // Group modules by pillar
  const modulesByPillar = modules.reduce((acc, module) => {
    if (!acc[module.pillar]) acc[module.pillar] = [];
    acc[module.pillar].push(module);
    return acc;
  }, {} as Record<ModulePillar, typeof modules>);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Module Selection */}
      <div className="lg:col-span-2">
        <Card className="p-6">
          <h3 className="mb-6 text-xl font-bold">Select Your Modules</h3>

          {(Object.keys(modulesByPillar) as ModulePillar[]).map((pillar) => (
            <div key={pillar} className="mb-8 last:mb-0">
              <div className="mb-4 flex items-center gap-2">
                <Badge className={pillarColors[pillar]}>
                  {pillarLabels[pillar]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {modulesByPillar[pillar].length} modules available
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {modulesByPillar[pillar].map((module) => {
                  const isSelected = selectedModules.includes(module.id);
                  return (
                    <button
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      className={`group relative rounded-lg border-2 p-4 text-left transition-all ${
                        isSelected
                          ? 'border-[#174940] bg-[#174940]/5'
                          : 'border-border hover:border-[#174940]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="mb-1 font-semibold">{module.name}</div>
                          <div className="mb-2 text-xs text-muted-foreground">
                            {module.description}
                          </div>
                          {module.timeSaved && (
                            <div className="text-xs font-medium text-green-600">
                              Saves {module.timeSaved}
                            </div>
                          )}
                        </div>
                        <div
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                            isSelected
                              ? 'border-[#174940] bg-[#174940]'
                              : 'border-muted-foreground/30 group-hover:border-[#174940]/50'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Add-ons */}
          <div className="mt-8 border-t pt-6">
            <h4 className="mb-4 font-semibold">Add-Ons (Optional)</h4>
            <div className="space-y-3">
              {addOns.map((addOn) => {
                const isSelected = selectedAddOns.includes(addOn.id);
                return (
                  <button
                    key={addOn.id}
                    onClick={() => toggleAddOn(addOn.id)}
                    className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#174940] bg-[#174940]/5'
                        : 'border-border hover:border-[#174940]/30'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="mb-1 font-semibold">{addOn.name}</div>
                      <div className="text-xs text-muted-foreground">{addOn.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold">{addOn.price}</div>
                      <div
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                          isSelected
                            ? 'border-[#174940] bg-[#174940]'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Card (Sticky) */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="p-6">
          <h3 className="mb-6 text-xl font-bold">Your Plan Summary</h3>

          {/* Seats */}
          <div className="mb-6">
            <Label className="mb-2 block text-sm font-medium">Team Seats</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSeats(Math.max(1, seats - 1))}
                disabled={seats <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold">{seats}</div>
                <div className="text-xs text-muted-foreground">
                  {seats <= 3 ? 'Included' : `+${seats - 3} seats`}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSeats(seats + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="mb-6 space-y-3 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Platform</span>
              <span className="font-medium">{formatCurrency(basePrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Modules ({selectedModules.length})
              </span>
              <span className="font-medium">{formatCurrency(modulePrice)}</span>
            </div>
            {seats > 3 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Extra Seats ({seats - 3})
                </span>
                <span className="font-medium">{formatCurrency(seatPrice)}</span>
              </div>
            )}
            {selectedAddOns.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Add-ons ({selectedAddOns.length})
                </span>
                <span className="font-medium">{formatCurrency(addOnPrice)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="mb-6 border-t pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total per month</span>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#174940]">
                  {formatCurrency(totalMonthly)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(totalMonthly * 12)}/year
                </div>
              </div>
            </div>
          </div>

          {/* Selected Modules List */}
          {selectedModules.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-sm font-medium">Selected Modules:</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedModules.map(id => {
                  const module = modules.find(m => m.id === id);
                  return module ? (
                    <Badge
                      key={id}
                      variant="outline"
                      className="text-xs"
                    >
                      {module.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-2">
            <Button
              asChild
              className="w-full bg-[#174940] hover:bg-[#174940]/90"
            >
              <a href="/app/signup">Start Free Trial</a>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <a href="/contact">Contact Sales</a>
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            14-day free trial • No credit card required
          </p>
        </Card>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
