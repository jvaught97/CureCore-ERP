import { Metadata } from 'next';
import { ROICalculator } from '@/components/marketing/ROICalculator';
import { CTASection } from '@/components/marketing/CTASection';
import { TrendingUp, Clock, DollarSign, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'ROI Calculator - CureCore SMOS',
  description: 'Calculate your return on investment with CureCore. Most teams see ROI in under 3 months.',
};

export default function ROIPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Calculate Your ROI
            <br />
            <span className="text-[#174940]">In 2 Minutes</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            See exactly how much time and money CureCore will save your team.
            Most brands see ROI in under 3 months and save $100k+ annually.
          </p>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-b bg-muted/30 px-4 py-12">
        <div className="container mx-auto">
          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                icon: Clock,
                stat: '45+',
                label: 'Hours saved per week',
                desc: 'Across your entire team',
              },
              {
                icon: DollarSign,
                stat: '$100k+',
                label: 'Annual cost savings',
                desc: 'Labor + error reduction',
              },
              {
                icon: TrendingUp,
                stat: '425%',
                label: 'Average ROI',
                desc: 'For our customers',
              },
              {
                icon: Target,
                stat: '2.8',
                label: 'Months to payback',
                desc: 'Average breakeven time',
              },
            ].map((item, i) => (
              <Card key={i} className="p-6 text-center">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <item.icon className="h-6 w-6 text-[#174940]" />
                </div>
                <div className="mb-1 text-3xl font-bold text-[#174940]">{item.stat}</div>
                <div className="mb-1 font-semibold">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Savings Add Up */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              How Savings Add Up
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              CureCore saves you money in two major ways
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Labor Savings</h3>
              <p className="mb-4 text-muted-foreground">
                Eliminate manual data entry, spreadsheet wrangling, and double-entry across systems.
                Your team gets hours back every week.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inventory management</span>
                  <span className="font-semibold">3 hrs/person/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch tracking</span>
                  <span className="font-semibold">4 hrs/person/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quote generation</span>
                  <span className="font-semibold">3 hrs/person/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Financial reporting</span>
                  <span className="font-semibold">2.5 hrs/person/week</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Error Reduction</h3>
              <p className="mb-4 text-muted-foreground">
                Manual processes lead to costly mistakes. CureCore's automation and validation
                prevents errors before they happen.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manufacturing errors</span>
                  <span className="font-semibold">$450/error avg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quoting mistakes</span>
                  <span className="font-semibold">$1,200/error avg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Financial errors</span>
                  <span className="font-semibold">$800/error avg</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>85% error reduction</span>
                  <span className="text-green-600">Typical result</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="border-b bg-muted/30 px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Calculate Your Savings
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Enter your team details and see personalized ROI projections
            </p>
          </div>

          <ROICalculator />
        </div>
      </section>

      <CTASection
        title="Ready to See These Savings in Real Life?"
        description="Start your 14-day free trial and experience the time savings firsthand."
      />
    </>
  );
}
