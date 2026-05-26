import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, ProductCategory } from "./types";

interface CartState {
  cart: CartItem[];
  addToCart: (productId: string, stock: number) => void;
  decrementCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      addToCart: (productId, stock) => {
        const cart = get().cart;
        const existing = cart.find((c) => c.productId === productId);
        const inCart = existing?.quantity ?? 0;
        if (inCart >= stock) return;
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
    }),
    {
      name: "coffee-os-cart",
      version: 1,
    }
  )
);

// --- Derived helpers (still useful for client-side derived UI) ---

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
