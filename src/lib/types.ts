export type Role = "owner" | "cashier";

export type ProductCategory = "Kopi" | "Non-Kopi" | "Makanan";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  minStockAlert: number;
  emoji: string;
}

export type PaymentMethod = "Cash" | "QRIS" | "Debit";

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtSale: number;
}

export interface Transaction {
  id: string;
  items: TransactionItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  createdAt: string; // ISO string
}

export interface CartItem {
  productId: string;
  quantity: number;
}
