import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const s = parts[0];
    return s.length >= 2 ? s.slice(0, 2).toUpperCase() : s.toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type AvatarProps = {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

export function Avatar({ name, className, size = "md" }: AvatarProps) {
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary-muted font-medium text-primary",
        sizeClasses[size],
        className
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
