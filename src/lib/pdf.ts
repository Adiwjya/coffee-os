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
const MUTED: [number, number, number] = [120, 120, 120];

interface LastAutoTableDoc extends jsPDF {
  lastAutoTable: { finalY: number };
}

export function generateSalesReportPDF(range: RangeInfo, transactions: Transaction[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as LastAutoTableDoc;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const innerWidth = pageWidth - margin * 2;
  const summary = summarize(transactions);

  // --- Header band ---
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
  doc.text(
    `Dicetak: ${format(new Date(), "d MMM yyyy, HH:mm", { locale: id })}`,
    pageWidth - margin,
    34,
    { align: "right" }
  );
  doc.text(`Periode: ${range.label}`, pageWidth - margin, 50, { align: "right" });

  let y = 100;

  // --- Summary boxes ---
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
  const boxW = (innerWidth - 30) / 4;
  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 10);
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 248, 245);
    doc.roundedRect(x, y, boxW, 56, 4, 4, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(b[0], x + 10, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(b[1], x + 10, y + 40);
  });
  y += 80;

  // --- Daily breakdown (full width) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text("Rekap Harian", margin, y);
  y += 8;

  const days = range.key === "today" ? 1 : range.key === "7d" ? 7 : 30;
  const daily = dailySeries(transactions, days);
  const dailyTotalRevenue = daily.reduce((s, d) => s + d.revenue, 0) || 1;

  autoTable(doc, {
    startY: y,
    head: [["Tanggal", "Transaksi", "Pendapatan", "% Periode"]],
    body: daily.map((d) => [
      d.date,
      formatNumber(d.count),
      rp(d.revenue),
      `${Math.round((d.revenue / dailyTotalRevenue) * 100)}%`,
    ]),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: AMBER, textColor: 0, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 24;

  // --- Side-by-side: Menu Terlaris (left) + Metode Pembayaran (right) ---
  const gap = 14;
  const colWidth = (innerWidth - gap) / 2;
  const leftRight = margin + colWidth; // right boundary of left column
  const rightLeft = leftRight + gap; // left boundary of right column

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Menu Terlaris", margin, y);
  doc.text("Metode Pembayaran", rightLeft, y);

  const tablesStartY = y + 8;

  autoTable(doc, {
    startY: tablesStartY,
    head: [["#", "Produk", "Qty", "Pendapatan"]],
    body: topProducts(transactions, 10).map((p, i) => [
      String(i + 1),
      p.name,
      formatNumber(p.qty),
      rp(p.revenue),
    ]),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: AMBER, textColor: 0, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    margin: { left: margin, right: pageWidth - leftRight },
  });
  const leftFinalY = doc.lastAutoTable.finalY;

  const payments = paymentBreakdown(transactions);
  const paymentTotal = payments.reduce((s, p) => s + p.revenue, 0) || 1;
  autoTable(doc, {
    startY: tablesStartY,
    head: [["Metode", "Transaksi", "Pendapatan", "%"]],
    body: payments.map((p) => [
      p.method,
      formatNumber(p.count),
      rp(p.revenue),
      `${Math.round((p.revenue / paymentTotal) * 100)}%`,
    ]),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: AMBER, textColor: 0, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    margin: { left: rightLeft, right: margin },
  });
  const rightFinalY = doc.lastAutoTable.finalY;

  y = Math.max(leftFinalY, rightFinalY) + 24;

  // --- Daftar Transaksi (full width, fills remaining space) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Daftar Transaksi", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `${formatNumber(transactions.length)} transaksi pada periode ini`,
    pageWidth - margin,
    y,
    { align: "right" }
  );
  doc.setTextColor(...DARK);
  y += 8;

  const txRows = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((t) => [
      t.id,
      format(new Date(t.createdAt), "d MMM, HH:mm", { locale: id }),
      String(t.items.reduce((s, it) => s + it.quantity, 0)),
      t.cashierName,
      t.paymentMethod,
      rp(t.totalAmount),
    ]);

  if (txRows.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("Tidak ada transaksi pada periode ini.", margin, y + 18);
  } else {
    autoTable(doc, {
      startY: y,
      head: [["No. Nota", "Waktu", "Item", "Kasir", "Bayar", "Total"]],
      body: txRows,
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 3.5 },
      headStyles: { fillColor: AMBER, textColor: 0, fontStyle: "bold" },
      columnStyles: {
        2: { halign: "right", cellWidth: 36 },
        4: { halign: "center", cellWidth: 50 },
        5: { halign: "right" },
      },
      margin: { left: margin, right: margin, bottom: 40 },
      didDrawPage: () => {
        // Re-paint a slim header on subsequent pages so the doc stays branded.
        const page = doc.getNumberOfPages();
        if (page === 1) return;
        doc.setFillColor(...AMBER);
        doc.rect(0, 0, pageWidth, 36, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Coffee OS — Laporan Penjualan", margin, 23);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Periode: ${range.label}`, pageWidth - margin, 23, { align: "right" });
      },
    });
  }

  // --- Footer on every page ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Coffee OS — Laporan dibuat otomatis  •  Halaman ${i} dari ${pageCount}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: "center" }
    );
  }

  const fileName = `laporan-penjualan-${range.key}-${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}
