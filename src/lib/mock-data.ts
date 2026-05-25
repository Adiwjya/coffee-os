import type { Product, Transaction, TransactionItem, User, PaymentMethod } from "./types";

export const USERS: User[] = [
  { id: "u1", name: "Budi Santoso", email: "owner@coffeeos.id", role: "owner" },
  { id: "u2", name: "Siti Rahma", email: "kasir@coffeeos.id", role: "cashier" },
];

export const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Espresso", category: "Kopi", price: 18000, stock: 120, minStockAlert: 20, emoji: "☕" },
  { id: "p2", name: "Americano", category: "Kopi", price: 22000, stock: 95, minStockAlert: 20, emoji: "☕" },
  { id: "p3", name: "Cappuccino", category: "Kopi", price: 28000, stock: 60, minStockAlert: 20, emoji: "☕" },
  { id: "p4", name: "Caffe Latte", category: "Kopi", price: 28000, stock: 14, minStockAlert: 20, emoji: "🥛" },
  { id: "p5", name: "Kopi Susu Aren", category: "Kopi", price: 25000, stock: 8, minStockAlert: 25, emoji: "🧋" },
  { id: "p6", name: "Caramel Macchiato", category: "Kopi", price: 32000, stock: 45, minStockAlert: 15, emoji: "☕" },
  { id: "p7", name: "Matcha Latte", category: "Non-Kopi", price: 30000, stock: 38, minStockAlert: 15, emoji: "🍵" },
  { id: "p8", name: "Chocolate", category: "Non-Kopi", price: 27000, stock: 52, minStockAlert: 15, emoji: "🍫" },
  { id: "p9", name: "Teh Tarik", category: "Non-Kopi", price: 18000, stock: 5, minStockAlert: 15, emoji: "🥤" },
  { id: "p10", name: "Lemon Tea", category: "Non-Kopi", price: 20000, stock: 70, minStockAlert: 15, emoji: "🍋" },
  { id: "p11", name: "Croissant", category: "Makanan", price: 24000, stock: 30, minStockAlert: 10, emoji: "🥐" },
  { id: "p12", name: "Butter Cookies", category: "Makanan", price: 15000, stock: 3, minStockAlert: 10, emoji: "🍪" },
  { id: "p13", name: "Cheese Cake", category: "Makanan", price: 35000, stock: 18, minStockAlert: 8, emoji: "🍰" },
  { id: "p14", name: "Roti Bakar", category: "Makanan", price: 22000, stock: 26, minStockAlert: 10, emoji: "🍞" },
];

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "QRIS", "QRIS", "Debit"];
const CASHIERS = ["Siti Rahma", "Budi Santoso"];

// Simple seeded PRNG so seed transactions stay stable between reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeedTransactions(): Transaction[] {
  const rand = mulberry32(42);
  const transactions: Transaction[] = [];
  const now = new Date();
  let counter = 0;

  // Generate transactions for the last 30 days.
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    // More sales on recent days and weekends.
    const day = new Date(now);
    day.setDate(now.getDate() - dayOffset);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const base = isWeekend ? 14 : 9;
    const count = base + Math.floor(rand() * 8);

    for (let i = 0; i < count; i++) {
      const itemCount = 1 + Math.floor(rand() * 3);
      const items: TransactionItem[] = [];
      const usedProducts = new Set<string>();

      for (let j = 0; j < itemCount; j++) {
        const product = SEED_PRODUCTS[Math.floor(rand() * SEED_PRODUCTS.length)];
        if (usedProducts.has(product.id)) continue;
        usedProducts.add(product.id);
        const quantity = 1 + Math.floor(rand() * 2);
        items.push({
          productId: product.id,
          name: product.name,
          quantity,
          priceAtSale: product.price,
        });
      }

      const totalAmount = items.reduce((sum, it) => sum + it.priceAtSale * it.quantity, 0);
      const hour = 8 + Math.floor(rand() * 12);
      const minute = Math.floor(rand() * 60);
      const createdAt = new Date(day);
      createdAt.setHours(hour, minute, 0, 0);

      transactions.push({
        id: `TRX-${String(counter + 1).padStart(5, "0")}`,
        items,
        totalAmount,
        paymentMethod: PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)],
        cashierName: CASHIERS[Math.floor(rand() * CASHIERS.length)],
        createdAt: createdAt.toISOString(),
      });
      counter++;
    }
  }

  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
