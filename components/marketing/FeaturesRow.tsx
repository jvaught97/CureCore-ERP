import { Database, Workflow, TrendingUp } from 'lucide-react';
import { copy } from '@/data/copy';
import { Card } from '@/components/ui/card';

const iconMap = {
  database: Database,
  workflow: Workflow,
  'trending-up': TrendingUp,
};

export function FeaturesRow() {
  return (
    <section className="border-b px-4 py-16 md:py-24">
      <div className="container mx-auto">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Time Saved = Money Saved
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Stop wasting time on manual data entry, spreadsheets, and disconnected tools.
            CureCore automates your busywork so you can focus on growth.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {copy.valueProps.map((prop, index) => {
            const Icon = iconMap[prop.icon as keyof typeof iconMap];
            return (
              <Card key={index} className="relative overflow-hidden p-6 transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <Icon className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{prop.title}</h3>
                <p className="mb-4 text-muted-foreground">{prop.description}</p>
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  {prop.timeSaved}
                </div>
                {/* Decorative gradient */}
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#174940]/5 blur-2xl"></div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
