"use client";

import { useMemo, useState } from "react";
import { Download, Wallet, Receipt, Coffee, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  getRange,
  filterByRange,
  summarize,
  dailySeries,
  topProducts,
  type RangeKey,
} from "@/lib/analytics";
import { generateSalesReportPDF } from "@/lib/pdf";
import { formatRupiah, formatNumber, formatDateTime } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
];

export default function ReportsPage() {
  const transactions = useStore((s) => s.transactions);
  const [rangeKey, setRangeKey] = useState<RangeKey>("today");

  const range = useMemo(() => getRange(rangeKey), [rangeKey]);
  const rangeTx = useMemo(() => filterByRange(transactions, range), [transactions, range]);
  const summary = useMemo(() => summarize(rangeTx), [rangeTx]);
  const days = rangeKey === "today" ? 1 : rangeKey === "7d" ? 7 : 30;
  const daily = useMemo(() => dailySeries(transactions, days), [transactions, days]);
  const top = useMemo(() => topProducts(rangeTx, 8), [rangeTx]);

  function handleExport() {
    if (rangeTx.length === 0) {
      toast.warning("Tidak ada transaksi pada periode ini");
      return;
    }
    generateSalesReportPDF(range, rangeTx);
    toast.success("Laporan PDF berhasil diunduh");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Rekap keuangan siap cetak ke PDF.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.key} value={r.key}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button onClick={handleExport}>
            <Download className="size-4" />
            Cetak PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Wallet className="size-5" />}
          label="Total Pendapatan"
          value={formatRupiah(summary.revenue)}
          accent
        />
        <SummaryCard
          icon={<Receipt className="size-5" />}
          label="Jumlah Transaksi"
          value={formatNumber(summary.count)}
        />
        <SummaryCard
          icon={<Coffee className="size-5" />}
          label="Item Terjual"
          value={formatNumber(summary.itemsSold)}
        />
        <SummaryCard
          icon={<TrendingUp className="size-5" />}
          label="Rata-rata / Transaksi"
          value={formatRupiah(summary.avg)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rekap Harian</CardTitle>
            <CardDescription>{range.label}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Transaksi</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell className="font-medium">{d.date}</TableCell>
                    <TableCell className="text-right">{d.count}</TableCell>
                    <TableCell className="text-right">{formatRupiah(d.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Terlaris</CardTitle>
            <CardDescription>{range.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada penjualan pada periode ini.
              </p>
            ) : (
              top.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(p.qty)}×
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction list */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>
            {formatNumber(rangeTx.length)} transaksi pada periode {range.label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Nota</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead>Bayar</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rangeTx.slice(0, 50).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.id}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(t.createdAt)}
                  </TableCell>
                  <TableCell>
                    {t.items.reduce((s, it) => s + it.quantity, 0)} item
                  </TableCell>
                  <TableCell>{t.cashierName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(t.totalAmount)}
                  </TableCell>
                </TableRow>
              ))}
              {rangeTx.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Tidak ada transaksi pada periode ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : undefined}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
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
