import {
  startOfDay,
  endOfDay,
  subDays,
  isWithinInterval,
  format,
} from "date-fns";
import { id } from "date-fns/locale";
import type { Transaction } from "./types";

export type RangeKey = "today" | "7d" | "30d";

export interface RangeInfo {
  key: RangeKey;
  label: string;
  start: Date;
  end: Date;
}

export function getRange(key: RangeKey): RangeInfo {
  const end = endOfDay(new Date());
  switch (key) {
    case "today":
      return { key, label: "Hari Ini", start: startOfDay(new Date()), end };
    case "7d":
      return { key, label: "7 Hari Terakhir", start: startOfDay(subDays(new Date(), 6)), end };
    case "30d":
      return { key, label: "30 Hari Terakhir", start: startOfDay(subDays(new Date(), 29)), end };
  }
}

export function inRange(t: Transaction, range: RangeInfo): boolean {
  return isWithinInterval(new Date(t.createdAt), { start: range.start, end: range.end });
}

export function filterByRange(transactions: Transaction[], range: RangeInfo): Transaction[] {
  return transactions.filter((t) => inRange(t, range));
}

export interface Summary {
  revenue: number;
  count: number;
  itemsSold: number;
  avg: number;
}

export function summarize(transactions: Transaction[]): Summary {
  const revenue = transactions.reduce((s, t) => s + t.totalAmount, 0);
  const count = transactions.length;
  const itemsSold = transactions.reduce(
    (s, t) => s + t.items.reduce((a, it) => a + it.quantity, 0),
    0
  );
  return { revenue, count, itemsSold, avg: count ? Math.round(revenue / count) : 0 };
}

export interface DailyPoint {
  date: string;
  label: string;
  revenue: number;
  count: number;
}

export function dailySeries(transactions: Transaction[], days: number): DailyPoint[] {
  const today = startOfDay(new Date());
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(today, i);
    const dayEnd = endOfDay(day);
    const dayTx = transactions.filter((t) =>
      isWithinInterval(new Date(t.createdAt), { start: day, end: dayEnd })
    );
    points.push({
      date: format(day, "yyyy-MM-dd"),
      label: format(day, days > 7 ? "d MMM" : "EEE", { locale: id }),
      revenue: dayTx.reduce((s, t) => s + t.totalAmount, 0),
      count: dayTx.length,
    });
  }
  return points;
}

export interface ProductStat {
  name: string;
  qty: number;
  revenue: number;
}

export function topProducts(transactions: Transaction[], limit = 5): ProductStat[] {
  const map = new Map<string, ProductStat>();
  for (const t of transactions) {
    for (const it of t.items) {
      const existing = map.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
      existing.qty += it.quantity;
      existing.revenue += it.priceAtSale * it.quantity;
      map.set(it.productId, existing);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export interface PaymentStat {
  method: string;
  revenue: number;
  count: number;
}

export function paymentBreakdown(transactions: Transaction[]): PaymentStat[] {
  const map = new Map<string, PaymentStat>();
  for (const t of transactions) {
    const existing = map.get(t.paymentMethod) ?? {
      method: t.paymentMethod,
      revenue: 0,
      count: 0,
    };
    existing.revenue += t.totalAmount;
    existing.count += 1;
    map.set(t.paymentMethod, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}
