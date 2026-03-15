"use client";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "border border-border bg-surface text-secondary hover:bg-border-muted focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none",
  ghost:
    "text-secondary hover:bg-border-muted hover:text-foreground focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none",
  danger:
    "border border-color-error/30 bg-surface text-error hover:bg-error-muted focus-visible:ring-error disabled:opacity-50 disabled:pointer-events-none",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
