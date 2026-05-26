import { listProducts } from "@/server/actions/products";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const products = await listProducts();
  return <InventoryClient initialProducts={products} canEdit={session.user.role === "owner"} />;
}
