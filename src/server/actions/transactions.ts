"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, transactions, transactionItems } from "@/db/schema";
import { requireSession } from "@/lib/session";
import type { PaymentMethod, Transaction, TransactionItem } from "@/lib/types";

export interface CreateTransactionInput {
  items: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
}

export interface CreateTransactionResult {
  ok: boolean;
  transaction?: Transaction;
  error?: string;
}

function generateReceiptNumber(): string {
  // 8 hex chars from a random UUID — unique enough for a POS, race-free.
  return `TRX-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  const session = await requireSession();

  if (!input.items.length) {
    return { ok: false, error: "Keranjang masih kosong" };
  }

  try {
    const tx = await db.transaction(async (trx) => {
      const ids = input.items.map((i) => i.productId);
      const rows = await trx
        .select()
        .from(products)
        .where(inArray(products.id, ids))
        .for("update");

      const byId = new Map(rows.map((r) => [r.id, r]));
      const itemRecords: TransactionItem[] = [];
      let totalAmount = 0;

      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product) throw new Error("Produk tidak ditemukan");
        if (item.quantity <= 0) throw new Error("Jumlah tidak valid");
        if (item.quantity > product.stock) {
          throw new Error(`Stok ${product.name} tidak mencukupi`);
        }
        totalAmount += product.price * item.quantity;
        itemRecords.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          priceAtSale: product.price,
        });
      }

      const cashierName = session.user.name ?? "Kasir";
      const receiptNumber = generateReceiptNumber();

      const [created] = await trx
        .insert(transactions)
        .values({
          receiptNumber,
          totalAmount,
          paymentMethod: input.paymentMethod,
          cashierId: session.user.id,
          cashierName,
        })
        .returning();

      await trx.insert(transactionItems).values(
        itemRecords.map((it) => ({
          transactionId: created.id,
          productId: it.productId,
          productName: it.name,
          quantity: it.quantity,
          priceAtSale: it.priceAtSale,
        }))
      );

      for (const item of input.items) {
        await trx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() })
          .where(eq(products.id, item.productId));
      }

      const transaction: Transaction = {
        id: receiptNumber,
        items: itemRecords,
        totalAmount,
        paymentMethod: input.paymentMethod,
        cashierName,
        createdAt: created.createdAt.toISOString(),
      };
      return transaction;
    });

    revalidatePath("/", "layout");
    return { ok: true, transaction: tx };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses transaksi";
    return { ok: false, error: message };
  }
}

export async function listTransactions(limit?: number): Promise<Transaction[]> {
  await requireSession();
  const txRows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(limit ?? 1000);

  if (txRows.length === 0) return [];

  const itemRows = await db
    .select()
    .from(transactionItems)
    .where(
      inArray(
        transactionItems.transactionId,
        txRows.map((t) => t.id)
      )
    );

  const itemsByTx = new Map<string, TransactionItem[]>();
  for (const it of itemRows) {
    const arr = itemsByTx.get(it.transactionId) ?? [];
    arr.push({
      productId: it.productId,
      name: it.productName,
      quantity: it.quantity,
      priceAtSale: it.priceAtSale,
    });
    itemsByTx.set(it.transactionId, arr);
  }

  return txRows.map((t) => ({
    id: t.receiptNumber,
    items: itemsByTx.get(t.id) ?? [],
    totalAmount: t.totalAmount,
    paymentMethod: t.paymentMethod,
    cashierName: t.cashierName,
    createdAt: t.createdAt.toISOString(),
  }));
}
