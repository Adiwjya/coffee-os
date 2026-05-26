"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Printer,
  X,
  Loader2,
  Banknote,
  QrCode,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore, CATEGORIES } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDateTime } from "@/lib/format";
import type { PaymentMethod, Transaction } from "@/lib/types";
import type { ProductDTO } from "@/server/actions/products";
import { createTransaction } from "@/server/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PAYMENTS: PaymentMethod[] = ["Cash", "QRIS", "Debit"];

const PAYMENT_ICONS: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  Cash: Banknote,
  QRIS: QrCode,
  Debit: CreditCard,
};

type CartLine = ProductDTO & { quantity: number };

export function POSClient({ initialProducts }: { initialProducts: ProductDTO[] }) {
  const router = useRouter();
  const products = initialProducts;
  const cart = useCartStore((s) => s.cart);
  const addToCart = useCartStore((s) => s.addToCart);
  const decrementCart = useCartStore((s) => s.decrementCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);

  const [category, setCategory] = useState<string>("Semua");
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("Cash");
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === "Semua" || p.category === category;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, category, search]);

  const cartDetailed = useMemo<CartLine[]>(
    () =>
      cart
        .map((c) => {
          const product = products.find((p) => p.id === c.productId);
          return product ? { ...product, quantity: c.quantity } : null;
        })
        .filter((x): x is CartLine => x !== null),
    [cart, products]
  );

  const total = cartDetailed.reduce((s, it) => s + it.price * it.quantity, 0);
  const totalItems = cartDetailed.reduce((s, it) => s + it.quantity, 0);

  function handleAdd(product: ProductDTO) {
    if (product.stock <= 0) {
      toast.error(`${product.name} habis`);
      return;
    }
    const inCart = cart.find((c) => c.productId === product.id)?.quantity ?? 0;
    if (inCart >= product.stock) {
      toast.warning(`Stok ${product.name} hanya ${product.stock}`);
      return;
    }
    addToCart(product.id, product.stock);
  }

  function handleCheckout() {
    startTransition(async () => {
      const result = await createTransaction({
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        paymentMethod: payment,
      });
      if (!result.ok || !result.transaction) {
        toast.error(result.error ?? "Gagal memproses transaksi");
        return;
      }
      setReceipt(result.transaction);
      clearCart();
      setCartOpen(false);
      toast.success("Transaksi berhasil!", {
        description: `${result.transaction.id} • ${formatRupiah(result.transaction.totalAmount)}`,
      });
      router.refresh();
    });
  }

  const cartPanel = (
    <CartPanel
      cartDetailed={cartDetailed}
      total={total}
      totalItems={totalItems}
      payment={payment}
      setPayment={setPayment}
      onAdd={handleAdd}
      onDecrement={decrementCart}
      onRemove={removeFromCart}
      onClear={clearCart}
      onCheckout={handleCheckout}
      isPending={isPending}
    />
  );

  return (
    <div className="flex flex-col gap-4 pb-28 lg:grid lg:h-[calc(100vh-7rem)] lg:grid-cols-[1fr_380px] lg:gap-4 lg:pb-0">
      {/* Product catalog */}
      <div className="flex min-h-0 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kasir</h1>
          <p className="text-sm text-muted-foreground">
            Ketuk menu untuk menambahkan ke pesanan.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="Semua">Semua</TabsTrigger>
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c} value={c}>
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const out = product.stock <= 0;
              const low = product.stock > 0 && product.stock <= product.minStockAlert;
              return (
                <button
                  key={product.id}
                  onClick={() => handleAdd(product)}
                  disabled={out}
                  className="group relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-4xl">
                    {product.emoji}
                  </div>
                  <div className="line-clamp-1 text-sm font-semibold">{product.name}</div>
                  <div className="mt-0.5 text-sm font-bold text-primary">
                    {formatRupiah(product.price)}
                  </div>
                  <div className="mt-1">
                    {out ? (
                      <Badge variant="destructive">Habis</Badge>
                    ) : low ? (
                      <Badge variant="outline" className="border-destructive text-destructive">
                        Sisa {product.stock}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Stok {product.stock}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Menu tidak ditemukan.
            </div>
          )}
        </div>
      </div>

      {/* Desktop cart sidebar */}
      <div className="hidden min-h-0 flex-col rounded-xl border bg-card lg:flex">
        {cartPanel}
      </div>

      {/* Mobile cart sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[92vh] flex-col gap-0 rounded-t-2xl p-0 lg:hidden"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-primary" />
              Pesanan
              {totalItems > 0 && <Badge variant="secondary">{totalItems}</Badge>}
            </SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">{cartPanel}</div>
        </SheetContent>
      </Sheet>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:left-[var(--sidebar-width,16rem)] lg:hidden">
        <Button
          size="lg"
          className="h-14 w-full justify-between text-base"
          onClick={() => setCartOpen(true)}
          disabled={totalItems === 0}
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-5" />
            {totalItems === 0 ? "Keranjang kosong" : `${totalItems} item`}
          </span>
          <span className="font-bold">{formatRupiah(total)}</span>
        </Button>
      </div>

      <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function CartPanel({
  cartDetailed,
  total,
  totalItems,
  payment,
  setPayment,
  onAdd,
  onDecrement,
  onRemove,
  onClear,
  onCheckout,
  isPending,
}: {
  cartDetailed: CartLine[];
  total: number;
  totalItems: number;
  payment: PaymentMethod;
  setPayment: (p: PaymentMethod) => void;
  onAdd: (p: ProductDTO) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <div className="hidden items-center justify-between border-b p-4 lg:flex">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="size-5 text-primary" />
          Pesanan
          {totalItems > 0 && <Badge variant="secondary">{totalItems}</Badge>}
        </div>
        {cartDetailed.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="size-4" />
            Kosongkan
          </Button>
        )}
      </div>

      {/* Mobile-only "Kosongkan" row */}
      {cartDetailed.length > 0 && (
        <div className="flex items-center justify-end border-b px-4 py-2 lg:hidden">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="size-4" />
            Kosongkan
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {cartDetailed.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <ShoppingCart className="size-10 opacity-30" />
            <p className="text-sm">Belum ada pesanan.</p>
            <p className="text-xs">Ketuk menu untuk menambahkan.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cartDetailed.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border p-2"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xl">
                  {item.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRupiah(item.price)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => onDecrement(item.id)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => onAdd(item)}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground"
                  onClick={() => onRemove(item.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t p-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Metode pembayaran
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENTS.map((p) => {
              const active = payment === p;
              const Icon = PAYMENT_ICONS[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPayment(p)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-md border py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4" />
                  {p}
                </button>
              );
            })}
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold">{formatRupiah(total)}</span>
        </div>
        <Button
          size="lg"
          className="w-full"
          disabled={cartDetailed.length === 0 || isPending}
          onClick={onCheckout}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : "Proses Pembayaran"}
        </Button>
      </div>
    </>
  );
}

function ReceiptDialog({
  receipt,
  onClose,
}: {
  receipt: Transaction | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            Transaksi Selesai
          </DialogTitle>
        </DialogHeader>
        {receipt && (
          <div className="receipt-print rounded-lg border bg-card p-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold">Coffee OS</div>
              <div className="text-xs text-muted-foreground">
                Jl. Kopi Nikmat No. 7, Jakarta
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{receipt.id}</span>
              <span>{formatDateTime(receipt.createdAt)}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Kasir: {receipt.cashierName}
            </div>
            <Separator className="my-3" />
            <div className="space-y-1">
              {receipt.items.map((it) => (
                <div key={it.productId} className="flex justify-between">
                  <span>
                    {it.quantity}× {it.name}
                  </span>
                  <span>{formatRupiah(it.priceAtSale * it.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatRupiah(receipt.totalAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Pembayaran</span>
              <span>{receipt.paymentMethod}</span>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Terima kasih atas kunjungan Anda 🙏
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-full text-base sm:flex-1"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Cetak Struk
          </Button>
          <Button
            size="lg"
            className="h-12 w-full text-base sm:flex-1"
            onClick={onClose}
          >
            Transaksi Baru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
