"use client";

import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "warning" | "info";

const variantClasses: Record<AlertVariant, string> = {
  error: "border-color-error/50 bg-error-muted text-error",
  success:
    "border-color-success/50 bg-success-muted text-success",
  warning:
    "border-color-warning/50 bg-warning-muted text-warning",
  info: "border-color-info/50 bg-info-muted text-info",
};

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

export function Alert({
  variant = "info",
  className,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-md)] border p-4 text-sm",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
