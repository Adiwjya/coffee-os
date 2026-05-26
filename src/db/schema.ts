import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Better Auth core tables ---
// Names/columns follow the Better Auth Drizzle adapter expectations.
// `role` is a custom field surfaced on the session via `additionalFields`.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role", { enum: ["owner", "cashier", "gudang", "barista"] })
    .notNull()
    .default("cashier"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Coffee OS business tables ---

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category", { enum: ["Kopi", "Non-Kopi", "Makanan"] }).notNull(),
    price: integer("price").notNull(),
    stock: integer("stock").notNull().default(0),
    minStockAlert: integer("min_stock_alert").notNull().default(10),
    emoji: text("emoji").notNull().default("☕"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.category)]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptNumber: text("receipt_number").notNull().unique(),
    totalAmount: integer("total_amount").notNull(),
    paymentMethod: text("payment_method", { enum: ["Cash", "QRIS", "Debit"] }).notNull(),
    cashierId: text("cashier_id").references(() => user.id, { onDelete: "set null" }),
    cashierName: text("cashier_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transactions_created_at_idx").on(t.createdAt)]
);

export const transactionItems = pgTable(
  "transaction_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    priceAtSale: integer("price_at_sale").notNull(),
  },
  (t) => [
    index("transaction_items_transaction_id_idx").on(t.transactionId),
    index("transaction_items_product_id_idx").on(t.productId),
  ]
);

// --- Relations ---

export const transactionsRelations = relations(transactions, ({ many, one }) => ({
  items: many(transactionItems),
  cashier: one(user, {
    fields: [transactions.cashierId],
    references: [user.id],
  }),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
  product: one(products, {
    fields: [transactionItems.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  saleItems: many(transactionItems),
}));

// --- Inferred types ---

export type DbProduct = typeof products.$inferSelect;
export type DbNewProduct = typeof products.$inferInsert;
export type DbTransaction = typeof transactions.$inferSelect;
export type DbNewTransaction = typeof transactions.$inferInsert;
export type DbTransactionItem = typeof transactionItems.$inferSelect;
export type DbNewTransactionItem = typeof transactionItems.$inferInsert;
export type DbUser = typeof user.$inferSelect;
