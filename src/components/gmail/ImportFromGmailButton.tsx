"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type ImportFromGmailButtonProps = {
  variant?: "primary" | "secondary";
  className?: string;
};

export function ImportFromGmailButton({
  variant = "secondary",
  className = "",
}: ImportFromGmailButtonProps) {
  return (
    <Link
      href="/gmail-import"
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary-hover"
          : "border border-border bg-surface text-secondary hover:bg-border-muted",
        className
      )}
    >
      Import from Gmail
    </Link>
  );
}
