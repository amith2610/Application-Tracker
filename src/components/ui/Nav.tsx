"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseIcon, ListIcon, PersonIcon, FolderIcon, BarChartIcon, PlusIcon, EnvelopeIcon, SparklesIcon } from "./Icons";
import { ShareButton } from "./ShareButton";
import { Button } from "./Button";

const navItems = [
  { href: "/", label: "Board", Icon: BriefcaseIcon },
  { href: "/jobs", label: "Jobs", Icon: ListIcon },
  { href: "/gmail-import", label: "Import Gmail", Icon: EnvelopeIcon },
  { href: "/contacts", label: "Contacts", Icon: PersonIcon },
  { href: "/documents", label: "Documents", Icon: FolderIcon },
  { href: "/analytics", label: "Analytics", Icon: BarChartIcon },
  { href: "/ai/resume-match", label: "AI Match", Icon: SparklesIcon },
];

type AuthStatus = {
  isLoggedIn: boolean;
  email: string | null;
};

export function Nav() {
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthStatus>({ isLoggedIn: false, email: null });

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => setAuth({ isLoggedIn: data.isLoggedIn ?? false, email: data.email ?? null }))
      .catch(() => setAuth({ isLoggedIn: false, email: null }));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ isLoggedIn: false, email: null });
    window.location.href = "/login";
  }

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={auth.isLoggedIn ? "/" : "/login"}
          className="shrink-0 text-xl font-bold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          Job Tracker
        </Link>
        {auth.isLoggedIn ? (
          <>
            <div className="flex flex-1 items-center justify-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-[var(--radius-sm)] border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ShareButton type="board" label="Share" />
              <Link
                href="/jobs/new"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <PlusIcon className="size-4" />
                Create
              </Link>
              <span className="max-w-[160px] truncate text-sm text-muted" title={auth.email ?? undefined}>
                {auth.email}
              </span>
              <Button variant="ghost" type="button" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border-muted"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
