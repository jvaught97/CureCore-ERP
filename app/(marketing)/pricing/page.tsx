import { Metadata } from 'next';
import { pricingTiers } from '@/data/pricing';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PricingConfigurator } from '@/components/marketing/PricingConfigurator';
import { CTASection } from '@/components/marketing/CTASection';
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing - CureCore SMOS',
  description: 'Choose a pre-built plan or build your own with modular pricing. 14-day free trial, no credit card required.',
};

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Choose a pre-built plan or build your own. Start with a 14-day free trial—no credit card required.
          </p>
        </div>
      </section>

      {/* Pre-built Plans */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Pre-Built Plans</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Start quickly with curated module bundles designed for common use cases
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative overflow-hidden p-6 ${
                  tier.popular ? 'border-2 border-[#174940] shadow-lg' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute right-4 top-4">
                    <Badge className="bg-[#174940] hover:bg-[#174940]/90">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-bold">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.tagline}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#174940]">{tier.price}</span>
                    {tier.billing !== 'contact sales' && (
                      <span className="text-muted-foreground">/{tier.billing.replace('per ', '')}</span>
                    )}
                  </div>
                </div>

                <p className="mb-6 text-sm text-muted-foreground">{tier.description}</p>

                <Button
                  asChild
                  className={`mb-6 w-full ${
                    tier.popular
                      ? 'bg-[#174940] hover:bg-[#174940]/90'
                      : ''
                  }`}
                  variant={tier.popular ? 'default' : 'outline'}
                >
                  <Link href={tier.id === 'enterprise' ? '/contact' : '/app/signup'}>
                    {tier.cta}
                  </Link>
                </Button>

                <div className="space-y-3">
                  <div className="text-sm font-semibold">Features:</div>
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#174940]" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t pt-6">
                  <div className="mb-2 text-sm font-semibold">Included Modules:</div>
                  <div className="text-xs text-muted-foreground">
                    {tier.includedModules.length} modules including{' '}
                    {tier.includedModules.slice(0, 3).join(', ')}
                    {tier.includedModules.length > 3 && `, +${tier.includedModules.length - 3} more`}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Build Your Plan */}
      <section className="border-b bg-muted/30 px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Build Your Own Plan</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Need something custom? Select exactly the modules you want and pay only for what you use.
            </p>
          </div>

          <PricingConfigurator />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Pricing FAQ</h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            {[
              {
                q: 'What\'s included in the free trial?',
                a: 'Full access to all modules in your selected plan for 14 days. No credit card required. Your data stays with you even if you don\'t subscribe.',
              },
              {
                q: 'Can I change plans later?',
                a: 'Absolutely. You can upgrade, downgrade, or add/remove modules anytime. Changes take effect on your next billing cycle.',
              },
              {
                q: 'Is there a setup fee?',
                a: 'No setup fees. All plans include onboarding, data import assistance, and unlimited support during your trial.',
              },
              {
                q: 'What happens when I exceed my seat limit?',
                a: 'We\'ll notify you and you can add extra seats for $25/seat/month. You won\'t be locked out.',
              },
              {
                q: 'Do you offer annual billing?',
                a: 'Yes! Annual plans get 2 months free (equivalent to 17% off). Contact sales for annual pricing.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, ACH transfers, and can invoice for annual Enterprise contracts.',
              },
            ].map((faq, i) => (
              <Card key={i} className="p-6">
                <h3 className="mb-2 font-semibold">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Start Your Free Trial Today"
        description="No credit card required. Full access to your selected modules for 14 days."
      />
    </>
  );
}
