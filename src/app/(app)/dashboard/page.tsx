import { listProducts } from "@/server/actions/products";
import { listTransactions } from "@/server/actions/transactions";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [products, transactions] = await Promise.all([
    listProducts(),
    listTransactions(),
  ]);
  return <DashboardClient initialProducts={products} initialTransactions={transactions} />;
}
