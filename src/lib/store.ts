import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  CartItem,
  PaymentMethod,
  Product,
  ProductCategory,
  Role,
  Transaction,
  TransactionItem,
  User,
} from "./types";
import { SEED_PRODUCTS, USERS, generateSeedTransactions } from "./mock-data";

interface CheckoutResult {
  ok: boolean;
  transaction?: Transaction;
  error?: string;
}

interface AppState {
  currentUser: User | null;
  products: Product[];
  transactions: Transaction[];
  cart: CartItem[];

  // auth
  login: (role: Role) => void;
  logout: () => void;

  // cart
  addToCart: (productId: string) => void;
  decrementCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // checkout
  checkout: (paymentMethod: PaymentMethod) => CheckoutResult;

  // inventory
  restock: (productId: string, amount: number) => void;
  upsertProduct: (product: Omit<Product, "id"> & { id?: string }) => void;
  deleteProduct: (productId: string) => void;

  // demo
  resetData: () => void;
}

function nextTrxId(transactions: Transaction[]): string {
  const max = transactions.reduce((m, t) => {
    const n = parseInt(t.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `TRX-${String(max + 1).padStart(5, "0")}`;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      products: SEED_PRODUCTS,
      transactions: generateSeedTransactions(),
      cart: [],

      login: (role) => {
        const user = USERS.find((u) => u.role === role) ?? USERS[0];
        set({ currentUser: user });
      },
      logout: () => set({ currentUser: null, cart: [] }),

      addToCart: (productId) => {
        const product = get().products.find((p) => p.id === productId);
        if (!product) return;
        const cart = get().cart;
        const existing = cart.find((c) => c.productId === productId);
        const inCart = existing?.quantity ?? 0;
        if (inCart >= product.stock) return; // cannot exceed stock
        if (existing) {
          set({
            cart: cart.map((c) =>
              c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c
            ),
          });
        } else {
          set({ cart: [...cart, { productId, quantity: 1 }] });
        }
      },

      decrementCart: (productId) => {
        const cart = get().cart;
        const existing = cart.find((c) => c.productId === productId);
        if (!existing) return;
        if (existing.quantity <= 1) {
          set({ cart: cart.filter((c) => c.productId !== productId) });
        } else {
          set({
            cart: cart.map((c) =>
              c.productId === productId ? { ...c, quantity: c.quantity - 1 } : c
            ),
          });
        }
      },

      removeFromCart: (productId) =>
        set({ cart: get().cart.filter((c) => c.productId !== productId) }),

      clearCart: () => set({ cart: [] }),

      checkout: (paymentMethod) => {
        const { cart, products, transactions, currentUser } = get();
        if (cart.length === 0) return { ok: false, error: "Keranjang masih kosong" };

        // Validate stock.
        for (const item of cart) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) return { ok: false, error: "Produk tidak ditemukan" };
          if (item.quantity > product.stock) {
            return { ok: false, error: `Stok ${product.name} tidak mencukupi` };
          }
        }

        const items: TransactionItem[] = cart.map((c) => {
          const product = products.find((p) => p.id === c.productId)!;
          return {
            productId: product.id,
            name: product.name,
            quantity: c.quantity,
            priceAtSale: product.price,
          };
        });

        const totalAmount = items.reduce((s, it) => s + it.priceAtSale * it.quantity, 0);

        const transaction: Transaction = {
          id: nextTrxId(transactions),
          items,
          totalAmount,
          paymentMethod,
          cashierName: currentUser?.name ?? "Kasir",
          createdAt: new Date().toISOString(),
        };

        // Deduct stock automatically.
        const updatedProducts = products.map((p) => {
          const item = items.find((it) => it.productId === p.id);
          return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
        });

        set({
          products: updatedProducts,
          transactions: [transaction, ...transactions],
          cart: [],
        });

        return { ok: true, transaction };
      },

      restock: (productId, amount) =>
        set({
          products: get().products.map((p) =>
            p.id === productId ? { ...p, stock: p.stock + amount } : p
          ),
        }),

      upsertProduct: (product) => {
        const products = get().products;
        if (product.id) {
          set({
            products: products.map((p) =>
              p.id === product.id ? ({ ...p, ...product } as Product) : p
            ),
          });
        } else {
          const id = `p${Date.now()}`;
          set({ products: [...products, { ...product, id } as Product] });
        }
      },

      deleteProduct: (productId) =>
        set({ products: get().products.filter((p) => p.id !== productId) }),

      resetData: () =>
        set({
          products: SEED_PRODUCTS,
          transactions: generateSeedTransactions(),
          cart: [],
        }),
    }),
    {
      name: "coffee-os-store",
      version: 1,
    }
  )
);

// --- Derived selectors / helpers ---

export function getLowStock(products: Product[]): Product[] {
  return products
    .filter((p) => p.stock <= p.minStockAlert)
    .sort((a, b) => a.stock - b.stock);
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export const CATEGORIES: ProductCategory[] = ["Kopi", "Non-Kopi", "Makanan"];

// Avoids hydration mismatches caused by persisted localStorage state.
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
