import { listProducts } from "@/server/actions/products";
import { POSClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const products = await listProducts();
  return <POSClient initialProducts={products} />;
}
