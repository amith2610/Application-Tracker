"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-secondary">
        {error.message}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-border-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Go home
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted">
        If the error persists, ensure the database is set up:{" "}
        <code className="rounded bg-border-muted px-1 py-0.5 font-mono text-foreground">
          npx prisma migrate dev
        </code>
      </p>
    </div>
  );
}
