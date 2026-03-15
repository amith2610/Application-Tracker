"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 font-sans text-foreground antialiased">
        <h1 className="text-2xl font-bold">Application Error</h1>
        <p className="max-w-md text-center text-secondary">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-primary px-4 py-2 font-medium text-white transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
