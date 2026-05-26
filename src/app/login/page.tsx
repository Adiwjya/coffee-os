import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";
import { Coffee } from "lucide-react";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.user.role === "owner" ? "/dashboard" : "/pos");
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
          © {new Date().getFullYear()} Coffee OS — POS System
        </p>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  );
}
