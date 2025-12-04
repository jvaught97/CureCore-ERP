export const branding = {
  name: 'CureCore',
  tagline: 'Smart Manufacturing Operating System',
  primaryColor: '#174940',

  colors: {
    primary: '#174940',
    secondary: '#2D6A5F',
    accent: '#48A999',
    light: '#E8F5F3',
    gradients: {
      primary: 'bg-gradient-to-br from-[#174940] via-[#2D6A5F] to-[#48A999]',
      primarySubtle: 'bg-gradient-to-br from-[#174940] to-[#2D6A5F]',
      accent: 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F]',
      light: 'bg-gradient-to-br from-white to-[#E8F5F3]',
    },
    pillars: {
      operations: { color: '#3B82F6', light: '#DBEAFE', name: 'Operations' },
      commercial: { color: '#8B5CF6', light: '#EDE9FE', name: 'Commercial' },
      financial: { color: '#10B981', light: '#D1FAE5', name: 'Financial' },
    },
  },

  nav: {
    links: [
      { label: 'Modules', href: '/modules' },
      { label: 'Dashboards', href: '/dashboards' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'ROI Calculator', href: '/roi' },
      { label: 'Docs', href: '/docs' },
      { label: 'Contact', href: '/contact' },
    ],
    cta: {
      primary: { label: 'Start Free Trial', href: '/app/signup' },
      secondary: { label: 'Request Demo', href: '#demo' },
    },
  },

  footer: {
    sections: [
      {
        title: 'Product',
        links: [
          { label: 'Modules', href: '/modules' },
          { label: 'Dashboards', href: '/dashboards' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Pre-Launch Costing', href: '/prelaunch-costing' },
        ],
      },
      {
        title: 'Features',
        links: [
          { label: 'CRM & Sales', href: '/crm-overview' },
          { label: 'Finance & Accounting', href: '/finance' },
          { label: 'Compliance & COA', href: '/compliance' },
          { label: 'CureCore AI', href: '/#ai' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'Documentation', href: '/docs' },
          { label: 'ROI Calculator', href: '/roi' },
          { label: 'Contact Us', href: '/contact' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
        ],
      },
    ],
    social: [
      { name: 'LinkedIn', href: '#', icon: 'linkedin' },
      { name: 'Twitter', href: '#', icon: 'twitter' },
    ],
  },
} as const;
