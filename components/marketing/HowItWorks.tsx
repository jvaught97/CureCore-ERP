import { Plug, Calculator, Play } from 'lucide-react';
import { copy } from '@/data/copy';

const iconMap = {
  plug: Plug,
  calculator: Calculator,
  play: Play,
};

export function HowItWorks() {
  return (
    <section className="border-b px-4 py-16 md:py-24">
      <div className="container mx-auto">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Get up and running in three simple steps
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {copy.howItWorks.map((step, index) => {
            const Icon = iconMap[step.icon as keyof typeof iconMap];
            return (
              <div key={index} className="relative">
                {/* Connector line (desktop only) */}
                {index < copy.howItWorks.length - 1 && (
                  <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-gradient-to-r from-[#174940] to-[#174940]/20 md:block"></div>
                )}

                <div className="relative z-10 text-center">
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-[#174940] text-white shadow-lg">
                    <Icon className="h-10 w-10" />
                  </div>
                  <div className="mb-2 text-sm font-semibold text-[#174940]">
                    Step {step.step}
                  </div>
                  <h3 className="mb-3 text-2xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
