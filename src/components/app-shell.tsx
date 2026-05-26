"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  PanelLeftClose,
  UserPlus,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
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
import { ThemeToggle } from "@/components/theme-toggle";

export interface AppShellUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "cashier" | "gudang" | "barista";
}

export interface LowStockProduct {
  id: string;
  name: string;
  emoji: string;
  stock: number;
  minStockAlert: number;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false },
  { href: "/pos", label: "Kasir (POS)", icon: ShoppingCart, ownerOnly: false },
  { href: "/inventory", label: "Inventaris", icon: Package, ownerOnly: false },
  { href: "/staff", label: "Kasir Baru", icon: UserPlus, ownerOnly: true },
  { href: "/reports", label: "Laporan", icon: FileText, ownerOnly: true },
];

const COLLAPSED_KEY = "coffee-os-sidebar-collapsed";

function NavLinks({
  onNavigate,
  role,
  collapsed,
}: {
  onNavigate?: () => void;
  role: AppShellUser["role"];
  collapsed: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => !item.ownerOnly || role === "owner").map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center py-1",
        collapsed ? "justify-center px-0" : "gap-2 px-3"
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Coffee className="size-5" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-bold">Coffee OS</div>
          <div className="text-xs text-muted-foreground">POS System</div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  onNavigate,
  role,
  collapsed,
  onToggle,
  onLogout,
}: {
  onNavigate?: () => void;
  role: AppShellUser["role"];
  collapsed: boolean;
  onToggle?: () => void;
  onLogout: () => void;
}) {
  const canExpand = collapsed && !!onToggle;

  function handleBlankClick(e: React.MouseEvent<HTMLDivElement>) {
    if (canExpand && e.target === e.currentTarget) onToggle!();
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-6 p-3",
        collapsed && "px-2",
        canExpand && "cursor-pointer"
      )}
      onClick={handleBlankClick}
      role={canExpand ? "button" : undefined}
      aria-label={canExpand ? "Expand sidebar" : undefined}
      tabIndex={canExpand ? 0 : undefined}
      onKeyDown={
        canExpand
          ? (e) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onToggle!();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-1">
        {canExpand ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="rounded-md transition-opacity hover:opacity-80"
          >
            <Brand collapsed={collapsed} />
          </button>
        ) : (
          <Brand collapsed={collapsed} />
        )}
        {onToggle && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="size-8 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Minimize sidebar"
            title="Minimize sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      <NavLinks onNavigate={onNavigate} role={role} collapsed={collapsed} />

      <div className={cn("mt-auto flex flex-col gap-3", collapsed && "items-center")}>
        {!collapsed && (
          <div className="rounded-lg bg-accent p-3 text-xs text-accent-foreground">
            <p className="font-semibold">Coffee OS</p>
            <p className="mt-1 text-accent-foreground/80">
              Transaksi otomatis memotong stok & masuk pembukuan.
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={onLogout}
          title={collapsed ? "Keluar" : undefined}
          aria-label="Keluar"
          className={cn(
            "text-base font-semibold text-sidebar-foreground/80 hover:bg-destructive hover:text-white",
            collapsed
              ? "size-12 self-center p-0"
              : "h-12 w-full justify-start gap-3 px-4"
          )}
        >
          <LogOut className="size-5 shrink-0" />
          <span className={cn(collapsed && "sr-only")}>Keluar</span>
        </Button>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  currentUser,
  lowStock,
}: {
  children: React.ReactNode;
  currentUser: AppShellUser;
  lowStock: LowStockProduct[];
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore persisted collapsed state once on mount; render expanded on first
  // paint to avoid SSR/CSR mismatch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(COLLAPSED_KEY) === "1") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // localStorage unavailable (e.g. SSR or private mode) — ignore.
      }
      return next;
    });
  }

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  const initials = currentUser.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="flex min-h-screen bg-muted/30"
      style={{ "--sidebar-width": collapsed ? "4rem" : "16rem" } as React.CSSProperties}
    >
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:block",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen">
          <SidebarContent
            role={currentUser.role}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
              {/* Mobile sheet always renders expanded — no collapse there */}
              <SidebarContent
                role={currentUser.role}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
              />
            </SheetContent>
          </Sheet>

          <div className="md:hidden">
            <Brand collapsed={false} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

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
                      {currentUser.name}
                    </div>
                    <div className="text-xs capitalize text-muted-foreground">
                      {currentUser.role}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
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
