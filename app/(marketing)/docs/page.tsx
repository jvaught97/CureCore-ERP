import { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Video, Code, MessageCircle, FileText, Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation - CureCore SMOS',
  description: 'Guides, tutorials, API docs, and resources to help you get the most out of CureCore.',
};

export default function DocsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            CureCore Documentation
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Everything you need to get started, integrate, and optimize your CureCore SMOS
          </p>
        </div>
      </section>

      {/* Doc Categories */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Zap,
                title: 'Quick Start Guides',
                desc: 'Get up and running in minutes with step-by-step tutorials',
                links: [
                  'Setting up your account',
                  'Importing your first ingredients',
                  'Creating a formulation',
                  'Running your first batch',
                  'Generating a quote',
                ],
              },
              {
                icon: BookOpen,
                title: 'User Guides',
                desc: 'Comprehensive documentation for every module',
                links: [
                  'Inventory Management',
                  'R&D & Formulations',
                  'Batch Manufacturing',
                  'CRM & Sales',
                  'Financial Management',
                ],
              },
              {
                icon: Video,
                title: 'Video Tutorials',
                desc: 'Watch and learn with guided walkthroughs',
                links: [
                  'Platform overview (5 min)',
                  'Cost estimation deep-dive (12 min)',
                  'Quote designer tutorial (8 min)',
                  'Bank reconciliation (10 min)',
                  'AI copilot best practices (15 min)',
                ],
              },
              {
                icon: Code,
                title: 'API Documentation',
                desc: 'Integrate CureCore with your existing tools',
                links: [
                  'Authentication',
                  'REST API reference',
                  'Webhooks',
                  'Rate limits',
                  'Sample code',
                ],
              },
              {
                icon: FileText,
                title: 'Best Practices',
                desc: 'Tips, workflows, and optimization guides',
                links: [
                  'Setting up your chart of accounts',
                  'Inventory management workflows',
                  'Quote approval processes',
                  'Month-end close procedures',
                  'Data backup strategies',
                ],
              },
              {
                icon: MessageCircle,
                title: 'Support Resources',
                desc: 'Get help when you need it',
                links: [
                  'Contact support',
                  'Community forum',
                  'Feature requests',
                  'Known issues',
                  'Status page',
                ],
              },
            ].map((category, i) => (
              <Card key={i} className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <category.icon className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{category.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{category.desc}</p>
                <ul className="space-y-2 text-sm">
                  {category.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-[#174940] hover:underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="border-b bg-muted/30 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Popular Articles
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Most-read guides from our documentation
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: 'How to Calculate Unit Cost from a Formulation',
                desc: 'Learn how CureCore automatically calculates unit costs including materials, labor, overhead, and waste.',
                readTime: '8 min read',
              },
              {
                title: 'Setting Up Your First Manufacturing Workflow',
                desc: 'A complete guide to configuring your batch stages, quality checks, and packaging processes.',
                readTime: '12 min read',
              },
              {
                title: 'Creating Professional Quotes with the Quote Designer',
                desc: 'Design beautiful, branded quotes with terms, taxes, and e-signatures in minutes.',
                readTime: '10 min read',
              },
              {
                title: 'Connecting Your Bank Account for Reconciliation',
                desc: 'Import bank statements, set up matching rules, and automate monthly reconciliations.',
                readTime: '7 min read',
              },
              {
                title: 'Using CureCore AI to Speed Up Daily Tasks',
                desc: 'Discover AI prompts that save time on batch creation, cost estimates, and reporting.',
                readTime: '6 min read',
              },
              {
                title: 'Month-End Close Checklist for Manufacturers',
                desc: 'A step-by-step checklist to close your books quickly and accurately every month.',
                readTime: '9 min read',
              },
            ].map((article, i) => (
              <Card key={i} className="p-6 transition-shadow hover:shadow-lg">
                <h3 className="mb-2 font-bold">{article.title}</h3>
                <p className="mb-3 text-sm text-muted-foreground">{article.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{article.readTime}</span>
                  <Button variant="link" className="p-0 text-[#174940]">
                    Read more →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Can't Find What You're Looking For?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Our support team is here to help. Get answers in minutes, not days.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="bg-[#174940] hover:bg-[#174940]/90">
              <Link href="/contact">Contact Support</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/app/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
