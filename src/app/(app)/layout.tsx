"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Coffee } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    if (hydrated && !currentUser) {
      router.replace("/login");
    }
  }, [hydrated, currentUser, router]);

  if (!hydrated || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Coffee className="size-8 animate-pulse text-primary" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
