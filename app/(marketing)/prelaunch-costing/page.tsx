import { Metadata } from 'next';
import { PrelaunchCostEstimator } from '@/components/marketing/PrelaunchCostEstimator';
import { CTASection } from '@/components/marketing/CTASection';
import { Calculator, TrendingUp, Package, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Pre-Launch Costing - CureCore SMOS',
  description: 'Know your unit cost, margins, and breakeven before you launch. Make confident pricing decisions.',
};

export default function PrelaunchCostingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Know Your Unit Cost
                <br />
                <span className="text-[#174940]">Before You Launch</span>
              </h1>
              <p className="mb-8 text-xl text-muted-foreground">
                Most brands discover their real unit costs <em>after</em> they've already committed to pricing.
                CureCore changes that—model your costs, test scenarios, and price with confidence.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Calculator, label: 'Accurate costing', desc: 'Materials, labor, overhead, waste' },
                  { icon: TrendingUp, label: 'Margin analysis', desc: 'Hit your target profitability' },
                  { icon: Package, label: 'Batch modeling', desc: 'Scale from 10 to 10,000 units' },
                  { icon: DollarSign, label: 'Breakeven calc', desc: 'Know when you hit profitability' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#174940]/10">
                      <item.icon className="h-5 w-5 text-[#174940]" />
                    </div>
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Card className="w-full max-w-md p-6">
                <div className="mb-4 text-center">
                  <div className="mb-2 text-4xl font-bold text-[#174940]">$8.45</div>
                  <div className="text-sm text-muted-foreground">Estimated unit cost</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Materials</span>
                    <span className="font-medium">$4.20</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor</span>
                    <span className="font-medium">$2.10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overhead (25%)</span>
                    <span className="font-medium">$1.58</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Waste (5%)</span>
                    <span className="font-medium">$0.57</span>
                  </div>
                  <div className="border-t pt-2"></div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>Target MSRP (4x)</span>
                    <span className="text-[#174940]">$33.80</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Margin</span>
                    <span className="font-medium text-green-600">75%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* The Journey */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              From Formula to Profitability
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              CureCore connects every cost driver in your manufacturing process
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-5">
            {[
              { step: '1', title: 'Inventory', desc: 'Track ingredient costs by lot and supplier' },
              { step: '2', title: 'Formulations', desc: 'Build recipes with real-time cost estimates' },
              { step: '3', title: 'Batches', desc: 'Capture labor, overhead, and waste per batch' },
              { step: '4', title: 'Packaging', desc: 'Add container, label, and assembly costs' },
              { step: '5', title: 'Unit Cost', desc: 'Get your true landed cost per unit' },
            ].map((item, i) => (
              <Card key={i} className="relative p-6 text-center">
                {i < 4 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-background md:flex">
                    <div className="h-2 w-2 rounded-full bg-[#174940]"></div>
                  </div>
                )}
                <div className="mb-3 text-2xl font-bold text-[#174940]">{item.step}</div>
                <div className="mb-2 font-semibold">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Cost Estimator */}
      <section className="border-b bg-muted/30 px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Try the Cost Estimator
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Enter your batch details and see instant cost calculations, margin analysis, and breakeven projections.
            </p>
          </div>

          <PrelaunchCostEstimator />
        </div>
      </section>

      <CTASection
        title="Ready to Price with Confidence?"
        description="Connect your real data and get instant, accurate unit costs for every product you make."
      />
    </>
  );
}
