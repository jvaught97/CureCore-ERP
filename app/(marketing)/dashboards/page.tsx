import { Metadata } from 'next';
import { CTASection } from '@/components/marketing/CTASection';
import { DashboardTabs } from '@/components/marketing/DashboardTabs';

export const metadata: Metadata = {
  title: 'Interactive Dashboards - CureCore SMOS',
  description: 'Real-time dashboards for operations, commercial, and financial insights. See everything in one place.',
};

export default function DashboardsPage() {
  return (
    <>
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Your Entire Operation
            <br />
            <span className="text-[#174940]">In One Dashboard</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Real-time insights across operations, commercial, and financial pillars.
            No more jumping between tools or hunting for data in spreadsheets.
          </p>
        </div>
      </section>

      <DashboardTabs />

      <CTASection />
    </>
  );
}
