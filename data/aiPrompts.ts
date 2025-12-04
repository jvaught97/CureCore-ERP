export const aiPromptExamples = [
  {
    category: 'Manufacturing',
    prompts: [
      'Create a new 112mL cream batch from Formula v1.6',
      'Show me all batches in packaging stage',
      'What ingredients are below reorder point?',
      'Generate a COA for Batch #2847',
    ],
  },
  {
    category: 'Costing',
    prompts: [
      'Estimate unit cost for Roller 84mL v2.3 with current packaging',
      'What\'s my gross margin if I price this at $45 MSRP?',
      'Show me cost breakdown for last month\'s batches',
      'Calculate breakeven volume for new serum line',
    ],
  },
  {
    category: 'Commercial',
    prompts: [
      'Generate a quote for 1,200 units with 30-day terms',
      'Show all open opportunities over $10k',
      'What\'s my sales pipeline value by stage?',
      'Create a follow-up task for Acme Industries quote',
    ],
  },
  {
    category: 'Inventory',
    prompts: [
      'Show low-stock ingredients and suggest vendors',
      'What packaging is ready for Batch #2850?',
      'Generate purchase order for Q2 ingredient forecast',
      'Show me lot traceability for ingredient LOT-45892',
    ],
  },
  {
    category: 'Finance',
    prompts: [
      'Show P&L for last quarter by department',
      'What\'s my cash runway at current burn rate?',
      'Generate invoice for Sales Order #1847',
      'Show AR aging and flag overdue accounts',
    ],
  },
] as const;

export const aiCapabilities = [
  {
    title: 'Natural Language Commands',
    description: 'Ask questions in plain English. No need to learn complex menus or shortcuts.',
    icon: 'message-square',
  },
  {
    title: 'Instant Calculations',
    description: 'Get unit costs, margins, breakeven volumes, and forecasts in seconds.',
    icon: 'calculator',
  },
  {
    title: 'Smart Suggestions',
    description: 'AI flags low inventory, suggests reorder points, and identifies cost optimization opportunities.',
    icon: 'lightbulb',
  },
  {
    title: 'Automated Tasks',
    description: 'Generate quotes, create batches, send reminders, and update records with a single prompt.',
    icon: 'zap',
  },
] as const;
