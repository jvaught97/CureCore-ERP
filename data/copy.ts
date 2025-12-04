export const copy = {
  hero: {
    headline: 'Smart Manufacturing. Simplified.',
    subheadline: 'Reduce busywork, launch faster, and know your costs before you scale.',
    description: 'CureCore is the all-in-one Smart Manufacturing Operating System that connects your operations, commercial, and financial teams—with AI that keeps work moving.',
  },

  valueProps: [
    {
      title: 'Centralized Data',
      description: 'Track every ingredient, batch, package, and sale to the exact lot. No more spreadsheets, no more guessing.',
      icon: 'database',
      timeSaved: '15 hours/week',
    },
    {
      title: 'Automated Workflows',
      description: 'AI tasking, smart checklists, and automatic reminders keep your team on track without the busywork.',
      icon: 'workflow',
      timeSaved: '20 hours/week',
    },
    {
      title: 'Real-Time ROI',
      description: 'Know your unit cost, margins, and budgets before you scale. Make decisions with confidence.',
      icon: 'trending-up',
      timeSaved: '10 hours/week',
    },
  ],

  howItWorks: [
    {
      step: 1,
      title: 'Connect',
      description: 'Import your ingredients, formulations, packaging, and suppliers. CureCore builds your smart foundation.',
      icon: 'plug',
    },
    {
      step: 2,
      title: 'Model',
      description: 'Create formulas, estimate costs, and plan batches. Know your unit cost before you manufacture.',
      icon: 'calculator',
    },
    {
      step: 3,
      title: 'Operate',
      description: 'Run batches, track inventory, quote customers, and close the books—all in one operating system.',
      icon: 'play',
    },
  ],

  keyMessages: [
    'Know your unit cost before you launch.',
    'Track every ingredient, batch, and package to the exact lot.',
    'From leads and quotes to distribution—your commercial engine in one place.',
    'Close the loop with finance: P&L, budgets, AR/AP, tax, and reporting.',
    'CureCore AI guides your team—ask questions, execute tasks, and keep work moving.',
  ],

  testimonials: [
    {
      quote: 'CureCore cut our launch timeline in half. We knew our costs, margins, and packaging needs before we even started manufacturing.',
      author: 'Sarah Chen',
      role: 'Founder & CEO',
      company: 'Botanical Wellness Co.',
      avatar: '/testimonials/sarah.jpg',
    },
    {
      quote: 'Finally, one system that connects R&D, operations, sales, and finance. No more duplicate data entry or version control nightmares.',
      author: 'Marcus Rodriguez',
      role: 'COO',
      company: 'Pure Formulations',
      avatar: '/testimonials/marcus.jpg',
    },
    {
      quote: 'The AI copilot is like having a manufacturing expert on call 24/7. It answers questions, generates quotes, and flags issues before they become problems.',
      author: 'Jennifer Wu',
      role: 'VP Operations',
      company: 'Summit Naturals',
      avatar: '/testimonials/jennifer.jpg',
    },
  ],

  faqs: [
    {
      question: 'How long does implementation take?',
      answer: 'Most teams are up and running in 1-2 weeks. We provide onboarding, data import assistance, and training to get you started quickly.',
    },
    {
      question: 'Can I customize CureCore for my specific workflows?',
      answer: 'Yes! CureCore is designed for flexibility. You can configure fields, workflows, and reports to match your exact processes.',
    },
    {
      question: 'What if I only need certain modules?',
      answer: 'Our Build-Your-Plan option lets you select only the modules you need. Start with core operations and add commercial or financial modules as you grow.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use bank-level encryption, SOC 2 compliance, and regular security audits. Your data is backed up daily and you maintain full ownership.',
    },
    {
      question: 'Do you offer a free trial?',
      answer: 'Yes! All plans include a 14-day free trial with full access to your selected modules. No credit card required.',
    },
    {
      question: 'What kind of support do you provide?',
      answer: 'All plans include email support and access to our documentation. Scale and Enterprise plans include priority support, dedicated onboarding, and a customer success manager.',
    },
  ],

  stats: {
    timeSaved: '45+ hours/week',
    batchesTracked: '10,000+',
    accuracyImprovement: '99.9%',
    customers: '500+',
  },
} as const;
