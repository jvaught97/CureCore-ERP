import { Metadata } from 'next';
import { CTASection } from '@/components/marketing/CTASection';
import { Card } from '@/components/ui/card';
import { ShieldCheck, FileCheck, Barcode, MapPin, AlertCircle, Search, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'COA & Compliance - CureCore SMOS',
  description: 'Full lot traceability, COA generation, barcode scanning, and audit-ready compliance.',
};

export default function CompliancePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Track Every Ingredient
            <br />
            <span className="text-[#174940]">To The Exact Lot</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Full chain-of-custody tracking from raw materials to finished goods.
            Generate COAs, trace lot history, and pass audits with confidence.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Check className="h-5 w-5 text-green-500" />
            <span>99.9% lot traceability accuracy</span>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Compliance Features
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Everything you need to maintain audit-ready records
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FileCheck,
                title: 'Certificate of Analysis (COA)',
                desc: 'Auto-generate COAs from batch records with test results, specifications, and lot numbers.',
                features: ['Template builder', 'Test result tracking', 'PDF generation', 'Digital signatures'],
              },
              {
                icon: Search,
                title: 'Lot Traceability',
                desc: 'Track every ingredient lot from vendor to batch to finished product to customer.',
                features: ['Forward & backward tracing', 'Lot genealogy', 'Chain of custody', 'Recall readiness'],
              },
              {
                icon: Barcode,
                title: 'Barcode Scanning',
                desc: 'Scan ingredients, packaging, and finished goods for instant lot tracking and validation.',
                features: ['GS1 barcode support', 'Mobile scanning', 'Lot verification', 'Expiration alerts'],
              },
              {
                icon: MapPin,
                title: 'Location Tracking',
                desc: 'Track where every lot is stored, moved, and consumed across your facility.',
                features: ['Warehouse locations', 'Movement history', 'FIFO enforcement', 'Quarantine zones'],
              },
              {
                icon: AlertCircle,
                title: 'Recall Management',
                desc: 'Instantly identify affected batches and customers in case of recall.',
                features: ['Lot impact analysis', 'Customer notification', 'Recall documentation', 'Root cause tracking'],
              },
              {
                icon: ShieldCheck,
                title: 'Audit Exports',
                desc: 'Generate audit-ready reports with full chain-of-custody documentation.',
                features: ['Batch records', 'Lot history', 'Test results', 'Change logs'],
              },
            ].map((feature, i) => (
              <Card key={i} className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <feature.icon className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{feature.desc}</p>
                <ul className="space-y-1 text-xs">
                  {feature.features.map((item, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-[#174940]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Traceability Flow */}
      <section className="border-b bg-muted/30 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Complete Traceability
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              From raw material receipt to customer delivery—track every step
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {[
              { step: '1', title: 'Receive', desc: 'Ingredient arrives with lot #', example: 'LOT-45892' },
              { step: '2', title: 'Scan', desc: 'Barcode scanned at receiving', example: 'GS1 validated' },
              { step: '3', title: 'Use', desc: 'Lot consumed in Batch B-2847', example: '250g used' },
              { step: '4', title: 'Package', desc: 'Finished goods get new lot #', example: 'FG-8473' },
              { step: '5', title: 'Ship', desc: 'Customer receives with COA', example: 'Full traceability' },
            ].map((step, i) => (
              <Card key={i} className="relative p-6">
                {i < 4 && (
                  <div className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 items-center justify-center md:flex">
                    <svg className="h-6 w-6 text-[#174940]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                <div className="mb-2 text-center text-2xl font-bold text-[#174940]">{step.step}</div>
                <h3 className="mb-1 text-center font-semibold">{step.title}</h3>
                <p className="mb-2 text-center text-sm text-muted-foreground">{step.desc}</p>
                <div className="rounded bg-[#174940]/5 px-2 py-1 text-center text-xs font-mono">
                  {step.example}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Example COA */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Auto-Generated COAs
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Professional certificates of analysis generated from your batch records
            </p>
          </div>

          <Card className="mx-auto max-w-3xl p-8">
            <div className="mb-6 border-b pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-xl font-bold">Certificate of Analysis</h3>
                  <div className="text-sm text-muted-foreground">Batch: B-2847</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">Your Company Name</div>
                  <div className="text-muted-foreground">COA #: COA-2847-2025</div>
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-semibold">Product Information</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product:</span>
                    <span>Hydrating Serum 30mL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lot Number:</span>
                    <span className="font-mono">FG-8473</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batch Size:</span>
                    <span>100 units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mfg Date:</span>
                    <span>2025-01-08</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exp Date:</span>
                    <span>2027-01-08</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Test Results</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">pH:</span>
                    <span>5.8 ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Viscosity:</span>
                    <span>2800 cP ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Microbial:</span>
                    <span>Pass ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Appearance:</span>
                    <span>Clear ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Odor:</span>
                    <span>Characteristic ✓</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 border-t pt-4">
              <div className="mb-2 text-sm font-semibold">Ingredient Lot Traceability</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hyaluronic Acid (1%)</span>
                  <span className="font-mono">LOT-45892</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Glycerin</span>
                  <span className="font-mono">LOT-44783</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purified Water</span>
                  <span className="font-mono">LOT-45901</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Approved by: Jane Smith, QA Manager</span>
                <span>Date: 2025-01-09</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Regulatory Compliance */}
      <section className="bg-muted/30 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Regulatory Readiness
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Built for FDA, EU, and Health Canada compliance
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'FDA 21 CFR Part 111',
                desc: 'Current Good Manufacturing Practice (CGMP) for dietary supplements',
              },
              {
                title: 'EU Cosmetics Regulation',
                desc: 'Safety assessment and product information file requirements',
              },
              {
                title: 'Health Canada NHP',
                desc: 'Natural Health Products Regulations compliance',
              },
            ].map((reg, i) => (
              <Card key={i} className="p-6 text-center">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[#174940]" />
                <h3 className="mb-2 font-semibold">{reg.title}</h3>
                <p className="text-sm text-muted-foreground">{reg.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Ready for Your Next Audit?"
        description="Get audit-ready traceability and compliance tools from day one."
      />
    </>
  );
}
