"use client";

import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-colors",
        "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-error focus:border-error focus:ring-error",
        className
      )}
      {...props}
    />
  );
}
