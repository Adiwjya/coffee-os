import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireOwner(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "owner") {
    // Cashiers can't reach owner-only pages/actions.
    redirect("/pos");
  }
  return session;
}
