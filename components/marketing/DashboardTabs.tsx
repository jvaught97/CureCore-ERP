'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { operationsDashboard, commercialDashboard, financialDashboard, chartColors } from '@/data/demoData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Package, TrendingUp, DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function DashboardTabs() {
  return (
    <section className="border-b px-4 py-16">
      <div className="container mx-auto">
        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="mt-8">
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold">Operations Dashboard</h2>
              <p className="text-muted-foreground">Track batches, inventory, formulations, and quality in real-time</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Inventory Alerts</h3>
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="space-y-2">
                  {operationsDashboard.inventoryAlerts.map((item, i) => (
                    <div key={i} className="rounded-lg border p-2">
                      <div className="text-sm font-medium">{item.ingredient}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {item.current}
                          {item.unit} available
                        </span>
                        <Badge variant={item.status === 'critical' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Active Batches</h3>
                  <Package className="h-5 w-5 text-[#174940]" />
                </div>
                <div className="space-y-3">
                  {operationsDashboard.activeBatches.map((batch, i) => (
                    <div key={i} className="rounded-lg border p-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{batch.id}</span>
                        <Badge variant="outline">{batch.stage}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{batch.formula}</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-[#174940]" style={{ width: `${batch.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Batches by Stage</h3>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={operationsDashboard.batchesByStage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={chartColors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="commercial" className="mt-8">
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold">Commercial Dashboard</h2>
              <p className="text-muted-foreground">Manage your sales pipeline from leads to distribution</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-4 md:col-span-2">
                <h3 className="mb-4 font-semibold">Sales Pipeline</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  {Object.entries(commercialDashboard.pipeline).map(([stage, data]) => (
                    <div key={stage} className="rounded-lg border p-3">
                      <div className="mb-1 text-sm capitalize text-muted-foreground">{stage}</div>
                      <div className="text-2xl font-bold text-[#174940]">{data.count}</div>
                      <div className="text-xs text-muted-foreground">${(data.value / 1000).toFixed(0)}k value</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="mb-3 font-semibold">Recent Opportunities</h3>
                <div className="space-y-3">
                  {commercialDashboard.recentOpportunities.map((opp, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="mb-1 font-medium">{opp.name}</div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{opp.stage}</span>
                        <span className="font-semibold">${(opp.value / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {opp.probability}% probability • {opp.owner}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="mb-3 font-semibold">Quote Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={commercialDashboard.quoteStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {commercialDashboard.quoteStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(chartColors)[index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="mt-8">
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold">Financial Dashboard</h2>
              <p className="text-muted-foreground">Real-time P&L, cash flow, and financial health metrics</p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <Card className="p-4 md:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Monthly Revenue</h3>
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={financialDashboard.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="gross" stroke={chartColors.primary} strokeWidth={2} />
                    <Line type="monotone" dataKey="net" stroke={chartColors.accent} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">AP Aging</h3>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="space-y-3">
                  {[ 
                    { label: 'Current', amount: financialDashboard.apAging.current, percent: 100 },
                    { label: '30 Days', amount: financialDashboard.apAging.days30, percent: 70 },
                    { label: '60 Days', amount: financialDashboard.apAging.days60, percent: 40 },
                    { label: '90 Days', amount: financialDashboard.apAging.days90, percent: 20 },
                    { label: '90+ Days', amount: financialDashboard.apAging.over90, percent: 5 }
                  ].map((bucket) => (
                    <div key={bucket.label} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{bucket.label}</span>
                        <span className="font-semibold">${bucket.amount}k</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-[#174940]" style={{ width: `${bucket.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Audit Readiness</h3>
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  {financialDashboard.auditReadiness.map((item, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.area}</span>
                        <Badge variant={item.status === 'ready' ? 'default' : 'secondary'}>{item.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
