import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { Transaction } from "./types";
import {
  type RangeInfo,
  summarize,
  dailySeries,
  topProducts,
  paymentBreakdown,
} from "./analytics";
import { formatNumber } from "./format";

function rp(amount: number): string {
  return `Rp ${formatNumber(amount)}`;
}

const AMBER: [number, number, number] = [217, 119, 6];
const DARK: [number, number, number] = [38, 38, 38];

export function generateSalesReportPDF(range: RangeInfo, transactions: Transaction[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const summary = summarize(transactions);

  // Header band
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Coffee OS", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Laporan Penjualan", margin, 52);

  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  const generated = `Dicetak: ${format(new Date(), "d MMM yyyy, HH:mm", { locale: id })}`;
  doc.text(generated, pageWidth - margin, 34, { align: "right" });
  doc.text(`Periode: ${range.label}`, pageWidth - margin, 50, { align: "right" });

  let y = 100;

  // Summary boxes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Ringkasan", margin, y);
  y += 14;

  const boxes: [string, string][] = [
    ["Total Pendapatan", rp(summary.revenue)],
    ["Jumlah Transaksi", formatNumber(summary.count)],
    ["Item Terjual", formatNumber(summary.itemsSold)],
    ["Rata-rata / Transaksi", rp(summary.avg)],
  ];
  const boxW = (pageWidth - margin * 2 - 30) / 4;
  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 10);
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 248, 245);
    doc.roundedRect(x, y, boxW, 56, 4, 4, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(b[0], x + 10, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(b[1], x + 10, y + 40);
  });
  y += 80;

  // Daily breakdown table
  const days = range.key === "today" ? 1 : range.key === "7d" ? 7 : 30;
  const daily = dailySeries(transactions, days).filter(
    (d) => range.key !== "today" || d.count > 0 || true
  );

  autoTable(doc, {
    startY: y,
    head: [["Tanggal", "Transaksi", "Pendapatan"]],
    body: daily.map((d) => [d.date, formatNumber(d.count), rp(d.revenue)]),
    theme: "striped",
    headStyles: { fillColor: AMBER, textColor: 0, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  // Top products
  // @ts-expect-error lastAutoTable is added by the plugin
  y = doc.lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text("Menu Terlaris", margin, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["#", "Produk", "Qty", "Pendapatan"]],
    body: topProducts(transactions, 10).map((p, i) => [
      String(i + 1),
      p.name,
      formatNumber(p.qty),
      rp(p.revenue),
    ]),
    theme: "striped",
    headStyles: { fillColor: AMBER, textColor: 0, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  // Payment breakdown
  // @ts-expect-error lastAutoTable is added by the plugin
  y = doc.lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Metode Pembayaran", margin, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["Metode", "Transaksi", "Pendapatan"]],
    body: paymentBreakdown(transactions).map((p) => [
      p.method,
      formatNumber(p.count),
      rp(p.revenue),
    ]),
    theme: "striped",
    headStyles: { fillColor: AMBER, textColor: 0, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Coffee OS — Laporan dibuat otomatis  •  Halaman ${i} dari ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  const fileName = `laporan-penjualan-${range.key}-${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}
