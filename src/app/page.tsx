"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, useHydrated } from "@/lib/store";
import { Coffee } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) {
      router.replace("/login");
    } else {
      router.replace(currentUser.role === "owner" ? "/dashboard" : "/pos");
    }
  }, [hydrated, currentUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Coffee className="size-8 animate-pulse text-primary" />
    </div>
  );
}
