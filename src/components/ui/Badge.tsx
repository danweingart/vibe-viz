import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning" | "info" | "accent";
  size?: "xs" | "sm" | "md";
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
        "inline-flex items-center rounded-full font-medium uppercase tracking-wider",
        size === "xs" && "px-1.5 py-0.5 text-[9px]",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        variant === "default" && "bg-gvc-border text-gvc-text-muted",
        variant === "success" && "bg-gvc-green/20 text-gvc-green",
        variant === "danger" && "bg-gvc-red/20 text-gvc-red",
        variant === "warning" && "bg-brand/20 text-brand",
        variant === "info" && "bg-chart-info/20 text-chart-info",
        variant === "accent" && "bg-chart-accent/20 text-chart-accent",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
