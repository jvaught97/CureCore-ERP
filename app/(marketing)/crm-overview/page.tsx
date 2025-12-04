import { Metadata } from 'next';
import { CTASection } from '@/components/marketing/CTASection';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, ShoppingCart, ArrowRight, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CRM & Sales - CureCore SMOS',
  description: 'Manage leads, create branded quotes, and convert to sales orders—all in one place.',
};

export default function CRMPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                From First Contact
                <br />
                <span className="text-[#174940]">To Shipping Confirmation</span>
              </h1>
              <p className="mb-8 text-xl text-muted-foreground">
                Manage your entire commercial engine in CureCore: leads, contacts, accounts, opportunities,
                quotes, sales orders, and distribution—all connected to your manufacturing and financials.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-5 w-5 text-green-500" />
                <span>Saves 7-12 hours/week per sales rep</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Card className="w-full max-w-md p-6">
                <h3 className="mb-4 font-semibold">Sales Pipeline</h3>
                <div className="space-y-3">
                  {[
                    { stage: 'Leads', count: 47, value: 234500, color: 'bg-gray-100 dark:bg-gray-800' },
                    { stage: 'Opportunities', count: 23, value: 487200, color: 'bg-blue-100 dark:bg-blue-900/20' },
                    { stage: 'Quotes', count: 12, value: 156800, color: 'bg-purple-100 dark:bg-purple-900/20' },
                    { stage: 'Sales Orders', count: 8, value: 98400, color: 'bg-green-100 dark:bg-green-900/20' },
                  ].map((stage, i) => (
                    <div key={i} className={`rounded-lg ${stage.color} p-3`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold">{stage.stage}</span>
                        <Badge variant="secondary">{stage.count}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${(stage.value / 1000).toFixed(0)}k pipeline value
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Stages */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Your Commercial Pipeline
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Track every customer interaction from first contact to repeat order
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                icon: Users,
                title: 'Leads & Contacts',
                desc: 'Capture leads, track interactions, and nurture relationships.',
                features: ['Contact management', 'Activity timeline', 'Email integration', 'Follow-up reminders'],
              },
              {
                icon: FileText,
                title: 'Opportunities',
                desc: 'Track deals through your pipeline with probability scoring.',
                features: ['Stage tracking', 'Win/loss analysis', 'Revenue forecasting', 'Team collaboration'],
              },
              {
                icon: FileText,
                title: 'Quotes',
                desc: 'Generate branded, professional quotes in seconds.',
                features: ['Custom templates', 'E-signatures', 'Terms & taxes', 'Version tracking'],
              },
              {
                icon: ShoppingCart,
                title: 'Sales Orders',
                desc: 'Convert quotes to orders and track fulfillment.',
                features: ['One-click conversion', 'Inventory allocation', 'Shipment tracking', 'Invoice generation'],
              },
            ].map((stage, i) => (
              <Card key={i} className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <stage.icon className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{stage.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{stage.desc}</p>
                <ul className="space-y-1.5 text-sm">
                  {stage.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#174940]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Designer */}
      <section className="border-b bg-muted/30 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Quote Designer
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Create beautiful, professional quotes in minutes—not hours
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col justify-center space-y-6">
              {[
                {
                  title: 'Branded Templates',
                  desc: 'Upload your logo, set brand colors, and create quote templates that look like they came from a designer.',
                },
                {
                  title: 'Smart Pricing',
                  desc: 'Pull real-time unit costs from your batches, add markup, apply discounts, and calculate taxes automatically.',
                },
                {
                  title: 'Terms & Conditions',
                  desc: 'Include payment terms, shipping policies, and legal language. Save templates for different customer types.',
                },
                {
                  title: 'E-Signatures',
                  desc: 'Customers sign electronically. Get instant notifications when quotes are viewed, signed, or rejected.',
                },
                {
                  title: 'One-Click Conversion',
                  desc: 'Accepted quote? Convert to sales order with a single click. Inventory is auto-allocated.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#174940] text-white font-semibold">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="text-sm font-medium">Quote Preview</div>
                <Badge variant="secondary">DRAFT</Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Customer</div>
                  <div className="font-semibold">Wellness Corp</div>
                  <div className="text-sm text-muted-foreground">Contact: Sarah Johnson</div>
                </div>

                <div className="border-t pt-3">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Line Items</div>
                  <div className="space-y-2 text-sm">
                    {[
                      { product: 'Hydrating Serum 30mL', qty: 500, price: 8.50 },
                      { product: 'Vitamin C Cream 50mL', qty: 300, price: 12.75 },
                      { product: 'Night Repair Oil 15mL', qty: 200, price: 15.00 },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <div>
                          <div>{item.product}</div>
                          <div className="text-xs text-muted-foreground">Qty: {item.qty}</div>
                        </div>
                        <div className="font-medium">${(item.qty * item.price).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>$11,075.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount (5%)</span>
                      <span className="text-red-600">-$553.75</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax (8.5%)</span>
                      <span>$894.31</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total</span>
                      <span className="text-[#174940]">$11,415.56</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-medium">Payment Terms</div>
                  <div>Net 30 • Due: February 15, 2025</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Distribution */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Distribution & Fulfillment
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Track shipments, manage carriers, and keep customers updated
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Shipment Tracking',
                desc: 'Integrate with major carriers, generate shipping labels, and track deliveries in real-time.',
              },
              {
                title: 'Customer Notifications',
                desc: 'Automatically email customers when orders ship with tracking links and estimated delivery.',
              },
              {
                title: 'Returns & Credits',
                desc: 'Process returns, issue credits, and adjust inventory—all connected to your financials.',
              },
            ].map((item, i) => (
              <Card key={i} className="p-6">
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Ready to Streamline Your Sales Process?"
        description="From leads to shipment—manage your entire commercial operation in one platform."
      />
    </>
  );
}
