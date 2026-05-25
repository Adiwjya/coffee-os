"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, ShieldCheck, Store, ArrowRight } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  owner: { email: "owner@coffeeos.id", password: "owner123" },
  cashier: { email: "kasir@coffeeos.id", password: "kasir123" },
};

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const login = useStore((s) => s.login);
  const currentUser = useStore((s) => s.currentUser);

  const [role, setRole] = useState<Role>("owner");
  const [email, setEmail] = useState(CREDENTIALS.owner.email);
  const [password, setPassword] = useState(CREDENTIALS.owner.password);

  useEffect(() => {
    if (hydrated && currentUser) {
      router.replace(currentUser.role === "owner" ? "/dashboard" : "/pos");
    }
  }, [hydrated, currentUser, router]);

  function selectRole(next: Role) {
    setRole(next);
    setEmail(CREDENTIALS[next].email);
    setPassword(CREDENTIALS[next].password);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(role);
    router.replace(role === "owner" ? "/dashboard" : "/pos");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <Coffee className="size-6" />
          Coffee OS
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Kasir modern untuk
            <br />
            coffee shop Anda.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Jual kopi lebih cepat, stok otomatis terpotong, dan pembukuan
            harian langsung rapi. Akses dari laptop, tablet, atau smartphone.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Tap-to-Sell — pesan kopi cuma sekali ketuk",
              "Pembukuan & stok otomatis real-time",
              "Notifikasi stok menipis",
              "Cetak laporan PDF sekali klik",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-xs">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Coffee OS — Demo POS System
        </p>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="mb-2 flex items-center gap-2 lg:hidden">
              <Coffee className="size-6 text-primary" />
              <span className="text-lg font-semibold">Coffee OS</span>
            </div>
            <CardTitle className="text-2xl">Selamat datang kembali</CardTitle>
            <CardDescription>
              Masuk untuk membuka kasir dan dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <RoleButton
                active={role === "owner"}
                icon={<ShieldCheck className="size-5" />}
                title="Owner"
                subtitle="Pemilik"
                onClick={() => selectRole("owner")}
              />
              <RoleButton
                active={role === "cashier"}
                icon={<Store className="size-5" />}
                title="Kasir"
                subtitle="Cashier"
                onClick={() => selectRole("cashier")}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@coffeeos.id"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Masuk sebagai {role === "owner" ? "Owner" : "Kasir"}
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Kredensial demo sudah terisi otomatis. Klik “Masuk” untuk lanjut.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoleButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border hover:bg-muted"
      }`}
    >
      <span
        className={`flex size-9 items-center justify-center rounded-md ${
          active ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </button>
  );
}
