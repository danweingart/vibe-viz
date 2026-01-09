import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning" | "info";
  size?: "sm" | "md";
}

export function Badge({
  children,
  className,
  variant = "default",
  size = "sm",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        variant === "default" && "bg-border text-foreground-muted",
        variant === "success" && "bg-chart-success/20 text-chart-success",
        variant === "danger" && "bg-chart-danger/20 text-chart-danger",
        variant === "warning" && "bg-brand/20 text-brand",
        variant === "info" && "bg-chart-info/20 text-chart-info",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
