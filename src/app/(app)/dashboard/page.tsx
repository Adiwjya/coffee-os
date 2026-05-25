"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Wallet,
  Receipt,
  Coffee,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { useStore, getLowStock } from "@/lib/store";
import {
  getRange,
  filterByRange,
  summarize,
  dailySeries,
  topProducts,
  paymentBreakdown,
} from "@/lib/analytics";
import { formatRupiah, formatNumber, formatTime } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  revenue: { label: "Pendapatan", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const transactions = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);

  const today = useMemo(() => getRange("today"), []);
  const todayTx = useMemo(() => filterByRange(transactions, today), [transactions, today]);
  const todaySummary = useMemo(() => summarize(todayTx), [todayTx]);

  const series = useMemo(() => dailySeries(transactions, 7), [transactions]);
  const topToday = useMemo(() => topProducts(todayTx, 5), [todayTx]);
  const top7d = useMemo(
    () => topProducts(filterByRange(transactions, getRange("7d")), 5),
    [transactions]
  );
  const topList = topToday.length > 0 ? topToday : top7d;
  const payments = useMemo(
    () => paymentBreakdown(filterByRange(transactions, getRange("7d"))),
    [transactions]
  );
  const lowStock = useMemo(() => getLowStock(products), [products]);

  const recent = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan penjualan dan pembukuan hari ini.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatRupiah(todaySummary.revenue)}
          icon={<Wallet className="size-5" />}
          accent
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={formatNumber(todaySummary.count)}
          icon={<Receipt className="size-5" />}
        />
        <StatCard
          title="Item Terjual"
          value={formatNumber(todaySummary.itemsSold)}
          icon={<Coffee className="size-5" />}
        />
        <StatCard
          title="Rata-rata / Transaksi"
          value={formatRupiah(todaySummary.avg)}
          icon={<TrendingUp className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pendapatan 7 Hari Terakhir</CardTitle>
            <CardDescription>Grafik omzet harian secara real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={series} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v) => `${v / 1000}rb`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatRupiah(Number(value))}
                    />
                  }
                />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  fill="url(#fillRevenue)"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Stok Menipis
            </CardTitle>
            <CardDescription>
              {lowStock.length} produk perlu di-restock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Semua stok dalam kondisi aman 🎉
              </p>
            ) : (
              lowStock.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-2"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-lg">{p.emoji}</span>
                    {p.name}
                  </span>
                  <Badge variant={p.stock === 0 ? "destructive" : "outline"}>
                    {p.stock} / {p.minStockAlert}
                  </Badge>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/inventory">
                Kelola Inventaris
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Terlaris</CardTitle>
            <CardDescription>
              {topToday.length > 0 ? "Hari ini" : "7 hari terakhir"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada penjualan.
              </p>
            ) : (
              topList.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.qty} terjual</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Payment breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
            <CardDescription>7 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((p) => {
              const totalRev = payments.reduce((s, x) => s + x.revenue, 0) || 1;
              const pct = Math.round((p.revenue / totalRev) * 100);
              return (
                <div key={p.method} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{p.method}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>Aktivitas penjualan terakhir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium">{t.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(t.createdAt)} • {t.paymentMethod}
                  </div>
                </div>
                <span className="text-sm font-semibold">
                  {formatRupiah(t.totalAmount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : undefined}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div
          className={`flex size-11 items-center justify-center rounded-lg ${
            accent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
