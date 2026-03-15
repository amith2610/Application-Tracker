"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login", "/signup", "/share"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/share/"));
    if (isPublic) {
      setAllowed(true);
      setChecking(false);
      return;
    }
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.isLoggedIn) {
          setAllowed(true);
        } else {
          const from = encodeURIComponent(pathname || "/");
          router.replace(`/login?from=${from}`);
        }
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setChecking(false);
      });
  }, [pathname, router]);

  if (checking && !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
