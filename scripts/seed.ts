import "./_env";

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { products, user } from "../src/db/schema";
import { auth } from "../src/lib/auth";

const SEED_PRODUCTS = [
  { name: "Espresso", category: "Kopi" as const, price: 18000, stock: 120, minStockAlert: 20, emoji: "☕" },
  { name: "Americano", category: "Kopi" as const, price: 22000, stock: 95, minStockAlert: 20, emoji: "☕" },
  { name: "Cappuccino", category: "Kopi" as const, price: 28000, stock: 60, minStockAlert: 20, emoji: "☕" },
  { name: "Caffe Latte", category: "Kopi" as const, price: 28000, stock: 14, minStockAlert: 20, emoji: "🥛" },
  { name: "Kopi Susu Aren", category: "Kopi" as const, price: 25000, stock: 8, minStockAlert: 25, emoji: "🧋" },
  { name: "Caramel Macchiato", category: "Kopi" as const, price: 32000, stock: 45, minStockAlert: 15, emoji: "☕" },
  { name: "Matcha Latte", category: "Non-Kopi" as const, price: 30000, stock: 38, minStockAlert: 15, emoji: "🍵" },
  { name: "Chocolate", category: "Non-Kopi" as const, price: 27000, stock: 52, minStockAlert: 15, emoji: "🍫" },
  { name: "Teh Tarik", category: "Non-Kopi" as const, price: 18000, stock: 5, minStockAlert: 15, emoji: "🥤" },
  { name: "Lemon Tea", category: "Non-Kopi" as const, price: 20000, stock: 70, minStockAlert: 15, emoji: "🍋" },
  { name: "Croissant", category: "Makanan" as const, price: 24000, stock: 30, minStockAlert: 10, emoji: "🥐" },
  { name: "Butter Cookies", category: "Makanan" as const, price: 15000, stock: 3, minStockAlert: 10, emoji: "🍪" },
  { name: "Cheese Cake", category: "Makanan" as const, price: 35000, stock: 18, minStockAlert: 8, emoji: "🍰" },
  { name: "Roti Bakar", category: "Makanan" as const, price: 22000, stock: 26, minStockAlert: 10, emoji: "🍞" },
];

const SEED_USERS = [
  {
    name: "Budi Santoso",
    email: "owner@coffeeos.id",
    password: "owner123",
    role: "owner" as const,
  },
  {
    name: "Siti Rahma",
    email: "kasir@coffeeos.id",
    password: "kasir123",
    role: "cashier" as const,
  },
];

async function seedUsers() {
  console.log("Seeding users…");
  for (const u of SEED_USERS) {
    const existing = await db.select().from(user).where(eq(user.email, u.email)).limit(1);
    if (existing.length > 0) {
      console.log(`  • ${u.email} already exists, skipping`);
      continue;
    }
    // Go through Better Auth so the password is hashed correctly.
    await auth.api.signUpEmail({
      body: { email: u.email, password: u.password, name: u.name },
    });
    // Better Auth's input:false guard prevents setting role at signup, so update after.
    await db.update(user).set({ role: u.role }).where(eq(user.email, u.email));
    console.log(`  ✓ ${u.email} (${u.role})`);
  }
}

async function seedProducts() {
  console.log("Seeding products…");
  const existing = await db.select({ name: products.name }).from(products);
  const existingNames = new Set(existing.map((p) => p.name));

  const fresh = SEED_PRODUCTS.filter((p) => !existingNames.has(p.name));
  if (fresh.length === 0) {
    console.log("  • all seed products already exist, skipping");
    return;
  }
  await db.insert(products).values(fresh);
  console.log(`  ✓ inserted ${fresh.length} products`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Set it in .env.local before running seed.");
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is required for seeding users. Set it in .env.local."
    );
  }
  await seedUsers();
  await seedProducts();
  console.log("\nDone. Demo accounts:");
  console.log("  owner@coffeeos.id / owner123");
  console.log("  kasir@coffeeos.id / kasir123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
