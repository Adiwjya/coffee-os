"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  LogOut,
  Menu,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { useStore, getLowStock } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Kasir (POS)", icon: ShoppingCart },
  { href: "/inventory", label: "Inventaris", icon: Package },
  { href: "/reports", label: "Laporan", icon: FileText },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Coffee className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold">Coffee OS</div>
        <div className="text-xs text-muted-foreground">POS System</div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-3">
      <Brand />
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto rounded-lg bg-accent p-3 text-xs text-accent-foreground">
        <p className="font-semibold">Mode Demo</p>
        <p className="mt-1 text-accent-foreground/80">
          Data tersimpan di browser. Transaksi otomatis memotong stok &
          masuk pembukuan.
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const products = useStore((s) => s.products);
  const lowStock = getLowStock(products);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const initials = (currentUser?.name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="md:hidden">
            <Brand />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Low stock notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="size-5" />
                  {lowStock.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                      {lowStock.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  Notifikasi Stok
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {lowStock.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Semua stok aman 🎉
                  </div>
                ) : (
                  lowStock.slice(0, 6).map((p) => (
                    <DropdownMenuItem key={p.id} asChild>
                      <Link href="/inventory" className="flex justify-between">
                        <span>
                          {p.emoji} {p.name}
                        </span>
                        <Badge variant="destructive">{p.stock} tersisa</Badge>
                      </Link>
                    </DropdownMenuItem>
                  ))
                )}
                {lowStock.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/inventory" className="justify-center font-medium">
                        Lihat semua inventaris
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <div className="text-sm font-medium leading-none">
                      {currentUser?.name}
                    </div>
                    <div className="text-xs capitalize text-muted-foreground">
                      {currentUser?.role}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{currentUser?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut className="size-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
