import { requireOwner } from "@/lib/session";
import { listCashiers } from "@/server/actions/users";
import { StaffClient } from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireOwner();
  const users = await listCashiers();
  return <StaffClient initialUsers={users} />;
}
