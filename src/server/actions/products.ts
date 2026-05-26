"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireSession, requireOwner } from "@/lib/session";
import type { ProductCategory } from "@/lib/types";

export interface ProductDTO {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  minStockAlert: number;
  emoji: string;
}

function toDTO(row: typeof products.$inferSelect): ProductDTO {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    stock: row.stock,
    minStockAlert: row.minStockAlert,
    emoji: row.emoji,
  };
}

export async function listProducts(): Promise<ProductDTO[]> {
  await requireSession();
  const rows = await db.select().from(products).orderBy(products.name);
  return rows.map(toDTO);
}

export interface UpsertProductInput {
  id?: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  minStockAlert: number;
  emoji: string;
}

export async function upsertProduct(input: UpsertProductInput): Promise<ProductDTO> {
  await requireOwner();
  const name = input.name.trim();
  if (!name) throw new Error("Nama produk wajib diisi");
  if (input.price < 0) throw new Error("Harga tidak boleh negatif");
  if (input.stock < 0) throw new Error("Stok tidak boleh negatif");

  if (input.id) {
    const [updated] = await db
      .update(products)
      .set({
        name,
        category: input.category,
        price: input.price,
        stock: input.stock,
        minStockAlert: input.minStockAlert,
        emoji: input.emoji,
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.id))
      .returning();
    if (!updated) throw new Error("Produk tidak ditemukan");
    revalidatePath("/", "layout");
    return toDTO(updated);
  }

  const [created] = await db
    .insert(products)
    .values({
      name,
      category: input.category,
      price: input.price,
      stock: input.stock,
      minStockAlert: input.minStockAlert,
      emoji: input.emoji,
    })
    .returning();
  revalidatePath("/", "layout");
  return toDTO(created);
}

export async function deleteProduct(id: string): Promise<void> {
  await requireOwner();
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/", "layout");
}

export async function restockProduct(id: string, amount: number): Promise<ProductDTO> {
  await requireSession();
  if (amount <= 0) throw new Error("Jumlah restock harus lebih dari 0");
  const [updated] = await db
    .update(products)
    .set({ stock: sql`${products.stock} + ${amount}`, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (!updated) throw new Error("Produk tidak ditemukan");
  revalidatePath("/", "layout");
  return toDTO(updated);
}
