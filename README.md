This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## CureCore AI Copilot

Install (or update) the shared AI dependencies before enabling the Copilot:

```bash
npm install zod openai @vercel/ai lucide-react
```

See `docs/ai-setup.md` for the end-to-end Copilot wiring checklist.

## Dashboards

Multi-tenant dashboards live under `app/(dashboards)/dashboard`. Shared data fetchers are consolidated in `actions.ts` and expect a parsed date-range object plus the signed-in tenant. UI primitives are available in `components/dashboard`:

- `KpiCard` for single-number metrics (supports deltas and deep links)
- `TrendCard` for quick bar/line visuals
- `DataTable` and `Section` for list views with consistent framing

To add a new KPI or chart:

1. Create (or extend) a server action in `app/(dashboards)/dashboard/actions.ts` that scopes results to `tenant_id` and returns typed data. Reuse the helper `getDateRangePreset` for consistent presets.
2. Import the action in the target dashboard page and pass the result into a `KpiCard`, `TrendCard`, or custom component.
3. If you need seed/sample data, add it to the Supabase migration or seed scripts (e.g. `supabase/migrations/20250108_dashboard_views.sql`) so local development surfaces the metric.

Navigation exposes the dashboards via the new “Dashboard” dropdown; visibility is role-gated through `canViewDashboard` in `lib/roles.ts`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
