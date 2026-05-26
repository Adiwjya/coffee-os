"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireOwner } from "@/lib/session";
import { STAFF_ROLES, type Role, type StaffRole } from "@/lib/types";

export interface CashierDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export async function listCashiers(): Promise<CashierDTO[]> {
  await requireOwner();
  const rows = await db.select().from(user).orderBy(asc(user.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role as Role,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface CreateCashierInput {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
}

export async function createCashier(input: CreateCashierInput): Promise<CashierDTO> {
  await requireOwner();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const role = input.role;

  if (!name) throw new Error("Nama wajib diisi");
  if (!email) throw new Error("Email wajib diisi");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Format email tidak valid");
  if (password.length < 6) throw new Error("Password minimal 6 karakter");
  if (!STAFF_ROLES.includes(role)) throw new Error("Role tidak valid");

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing.length > 0) throw new Error("Email sudah terdaftar");

  // Use Better Auth so the password is hashed correctly (same approach as the seed script).
  await auth.api.signUpEmail({ body: { email, password, name } });
  // Better Auth's input:false guard blocks setting role at signup, so apply it after.
  const [updated] = await db
    .update(user)
    .set({ role })
    .where(eq(user.email, email))
    .returning();

  revalidatePath("/staff");

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role as Role,
    createdAt: updated.createdAt.toISOString(),
  };
}
