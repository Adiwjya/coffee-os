import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { products } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { AppShell, type AppShellUser, type LowStockProduct } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const lowStockRows = await db
    .select({
      id: products.id,
      name: products.name,
      emoji: products.emoji,
      stock: products.stock,
      minStockAlert: products.minStockAlert,
    })
    .from(products)
    .where(sql`${products.stock} <= ${products.minStockAlert}`)
    .orderBy(asc(products.stock));

  const lowStock: LowStockProduct[] = lowStockRows;

  const currentUser: AppShellUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as AppShellUser["role"],
  };

  return (
    <AppShell currentUser={currentUser} lowStock={lowStock}>
      {children}
    </AppShell>
  );
}
