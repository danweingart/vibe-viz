/**
 * Page hero — the brand-yellow glowing title treatment, shared by every page.
 * size "lg" for the main dashboard, "md" for subpages.
 */
export function PageHero({
  title,
  size = "lg",
  children,
}: {
  title: string;
  size?: "lg" | "md";
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 relative">
      <div className="absolute -top-8 -left-4 w-64 h-32 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
      <div className="relative">
        <h1
          className={`${
            size === "lg" ? "text-5xl" : "text-4xl"
          } font-brice text-brand mb-3 tracking-tight glowing-text relative inline-block`}
        >
          {title}
          <div className="absolute inset-0 blur-[40px] bg-brand/20 animate-glow-pulse -z-10" />
        </h1>
        {children && (
          <p className="text-gvc-text-muted text-base sm:text-lg max-w-xl">{children}</p>
        )}
      </div>
    </div>
  );
}
