import { Metadata } from 'next';
import { modules, pillarLabels } from '@/data/pricing';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CTASection } from '@/components/marketing/CTASection';
import Link from 'next/link';
import { Package, Users, DollarSign, ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export const metadata: Metadata = {
  title: 'Modules - CureCore SMOS',
  description: 'Explore all CureCore modules across Operations, Commercial, and Financial pillars.',
};

const pillarIcons = {
  operations: Package,
  commercial: Users,
  financial: DollarSign,
};

const pillarDescriptions = {
  operations: 'Manage R&D, formulations, batches, inventory, packaging, and compliance—all in one place.',
  commercial: 'Track leads, create quotes, manage sales orders, and coordinate distribution effortlessly.',
  financial: 'Close the loop with P&L, budgets, AR/AP, payroll, tax, and comprehensive financial reporting.',
};

export default function ModulesPage() {
  const modulesByPillar = modules.reduce((acc, module) => {
    if (!acc[module.pillar]) acc[module.pillar] = [];
    acc[module.pillar].push(module);
    return acc;
  }, {} as Record<string, typeof modules>);

  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            One Platform.
            <br />
            <span className="text-[#174940]">Every Function.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Choose the modules you need today, add more as you grow.
            CureCore adapts to your business—not the other way around.
          </p>
          <Button size="lg" asChild className="bg-[#174940] hover:bg-[#174940]/90">
            <Link href="/pricing">
              Build Your Plan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Modules by Pillar */}
      {Object.entries(modulesByPillar).map(([pillar, pillarModules]) => {
        const PillarIcon = pillarIcons[pillar as keyof typeof pillarIcons];
        return (
          <section key={pillar} className="border-b px-4 py-16">
            <div className="container mx-auto">
              {/* Pillar Header */}
              <div className="mb-12 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#174940]">
                  <PillarIcon className="h-8 w-8 text-white" />
                </div>
                <h2 className="mb-4 text-3xl font-bold capitalize md:text-4xl">
                  {pillar} Pillar
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  {pillarDescriptions[pillar as keyof typeof pillarDescriptions]}
                </p>
              </div>

              {/* Module Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pillarModules.map((module) => {
                  const IconComponent = (LucideIcons as any)[module.icon.split('-').map((word: string, i: number) =>
                    i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)
                  ).join('')];

                  return (
                    <Card key={module.id} className="group relative overflow-hidden p-6 transition-all hover:shadow-lg">
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10 transition-colors group-hover:bg-[#174940]">
                        {IconComponent && <IconComponent className="h-6 w-6 text-[#174940] transition-colors group-hover:text-white" />}
                      </div>

                      <h3 className="mb-2 text-xl font-bold">{module.name}</h3>
                      <p className="mb-4 text-sm text-muted-foreground">{module.description}</p>

                      {module.timeSaved && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400">
                          Saves {module.timeSaved}
                        </Badge>
                      )}

                      {/* Decorative gradient */}
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#174940]/5 blur-2xl transition-opacity group-hover:opacity-100"></div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Time Savings Summary */}
      <section className="bg-muted/30 px-4 py-16">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Total Time Savings
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Across all modules, teams save an average of <strong className="text-[#174940]">45+ hours per week</strong>.
            That's over 2,300 hours per year—time you can reinvest in growth.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="mb-2 text-5xl font-bold text-[#174940]">85%</div>
              <div className="text-sm text-muted-foreground">Reduction in manual data entry</div>
            </div>
            <div>
              <div className="mb-2 text-5xl font-bold text-[#174940]">60%</div>
              <div className="text-sm text-muted-foreground">Faster quote-to-order conversion</div>
            </div>
            <div>
              <div className="mb-2 text-5xl font-bold text-[#174940]">99.9%</div>
              <div className="text-sm text-muted-foreground">Accuracy in cost calculations</div>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        title="Ready to Build Your Perfect Stack?"
        description="Start with the essentials and add modules as you grow. Every CureCore plan includes AI assistance and unlimited support."
      />
    </>
  );
}
