"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  PackagePlus,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  XCircle,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, CATEGORIES } from "@/lib/store";
import { formatRupiah, formatNumber } from "@/lib/format";
import type { Product, ProductCategory } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StockStatus = "ok" | "low" | "out";

function statusOf(p: Product): StockStatus {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStockAlert) return "low";
  return "ok";
}

export default function InventoryPage() {
  const products = useStore((s) => s.products);
  const restock = useStore((s) => s.restock);
  const upsertProduct = useStore((s) => s.upsertProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchCat = category === "Semua" || p.category === category;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
      }),
    [products, category, search]
  );

  const lowCount = products.filter((p) => statusOf(p) === "low").length;
  const outCount = products.filter((p) => statusOf(p) === "out").length;
  const inventoryValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventaris</h1>
          <p className="text-sm text-muted-foreground">
            Pantau stok, restock barang, dan kelola menu.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Tambah Produk
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat
          icon={<Package className="size-5" />}
          label="Total Produk"
          value={formatNumber(products.length)}
        />
        <MiniStat
          icon={<AlertTriangle className="size-5" />}
          label="Stok Menipis"
          value={formatNumber(lowCount)}
          tone="warning"
        />
        <MiniStat
          icon={<XCircle className="size-5" />}
          label="Stok Habis"
          value={formatNumber(outCount)}
          tone="danger"
        />
        <MiniStat
          icon={<Wallet className="size-5" />}
          label="Nilai Inventaris"
          value={formatRupiah(inventoryValue)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
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
            placeholder="Cari produk…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const status = statusOf(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-md bg-muted text-lg">
                          {p.emoji}
                        </span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatRupiah(p.price)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {p.stock}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        / min {p.minStockAlert}
                      </span>
                    </TableCell>
                    <TableCell>
                      {status === "out" ? (
                        <Badge variant="destructive">Habis</Badge>
                      ) : status === "low" ? (
                        <Badge variant="outline" className="border-destructive text-destructive">
                          Menipis
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary text-primary">
                          Aman
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRestocking(p)}
                        >
                          <PackagePlus className="size-4" />
                          Restock
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Produk tidak ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <ProductDialog
        open={creating || !!editing}
        product={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(data) => {
          upsertProduct(data);
          toast.success(editing ? "Produk diperbarui" : "Produk ditambahkan");
          setCreating(false);
          setEditing(null);
        }}
      />

      {/* Restock dialog */}
      <RestockDialog
        product={restocking}
        onClose={() => setRestocking(null)}
        onRestock={(amount) => {
          if (restocking) {
            restock(restocking.id, amount);
            toast.success(`Stok ${restocking.name} +${amount}`);
          }
          setRestocking(null);
        }}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus produk?</DialogTitle>
            <DialogDescription>
              {deleting?.name} akan dihapus dari daftar menu. Tindakan ini tidak
              bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) {
                  deleteProduct(deleting.id);
                  toast.success(`${deleting.name} dihapus`);
                }
                setDeleting(null);
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-muted text-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-10 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const EMOJI_CHOICES = ["☕", "🥛", "🧋", "🍵", "🍫", "🥤", "🍋", "🥐", "🍪", "🍰", "🍞", "🧁"];

function ProductDialog({
  open,
  product,
  onClose,
  onSave,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (data: Omit<Product, "id"> & { id?: string }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>
            Lengkapi detail produk dan ambang notifikasi stok.
          </DialogDescription>
        </DialogHeader>
        <ProductForm key={product?.id ?? "new"} product={product} onSave={onSave} />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({
  product,
  onSave,
}: {
  product: Product | null;
  onSave: (data: Omit<Product, "id"> & { id?: string }) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? "Kopi");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [minStockAlert, setMinStockAlert] = useState(String(product?.minStockAlert ?? "10"));
  const [emoji, setEmoji] = useState(product?.emoji ?? "☕");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }
    onSave({
      id: product?.id,
      name: name.trim(),
      category,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      minStockAlert: Number(minStockAlert) || 0,
      emoji,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama produk</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kopi Susu Aren" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Kategori</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Harga (Rp)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="25000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="stock">Stok awal</Label>
          <Input
            id="stock"
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min">Batas notifikasi</Label>
          <Input
            id="min"
            type="number"
            min={0}
            value={minStockAlert}
            onChange={(e) => setMinStockAlert(e.target.value)}
            placeholder="10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ikon</Label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex size-9 items-center justify-center rounded-md border text-lg transition-colors ${
                emoji === e ? "border-primary bg-accent" : "border-border hover:bg-muted"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full">
          {product ? "Simpan Perubahan" : "Tambah Produk"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RestockDialog({
  product,
  onClose,
  onRestock,
}: {
  product: Product | null;
  onClose: () => void;
  onRestock: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("10");

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Restock {product?.name}</DialogTitle>
          <DialogDescription>
            Stok saat ini: {product?.stock}. Tambahkan jumlah stok baru.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            {[10, 25, 50].map((n) => (
              <Button
                key={n}
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAmount(String(n))}
              >
                +{n}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah tambahan</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={() => {
              const n = Number(amount);
              if (n > 0) onRestock(n);
            }}
          >
            Tambah Stok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
