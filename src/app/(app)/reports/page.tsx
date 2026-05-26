import { requireOwner } from "@/lib/session";
import { listTransactions } from "@/server/actions/transactions";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireOwner();
  const transactions = await listTransactions();
  return <ReportsClient initialTransactions={transactions} />;
}
