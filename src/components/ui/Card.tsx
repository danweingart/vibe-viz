import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "glow" | "v2";
}

export function Card({
  children,
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border card-hover flex flex-col",
        // V2 styling with backdrop blur
        "bg-gvc-card border-gvc-border backdrop-blur-md",
        // Reduced padding
        "p-4 md:p-5",
        variant === "glow" && "brand-glow",
        variant === "v2" && "card-v2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-[var(--section-gap)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-bold text-foreground font-brice",
        // Token-based font size: 16px
        "text-[var(--text-xl)]"
      )}
      style={{ lineHeight: 1.1 }}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "hidden sm:block text-foreground-muted",
        // Token-based font size: 13px
        "text-[var(--text-md)]"
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}
