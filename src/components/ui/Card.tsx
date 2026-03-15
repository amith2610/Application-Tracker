"use client";

import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
};

export function Card({ title, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)]",
        className
      )}
      {...props}
    >
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      )}
      {children}
    </div>
  );
}
