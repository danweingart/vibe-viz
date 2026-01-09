import Link from "next/link";

interface ChartTitleProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
}

export function ChartTitle({ children, href, className = "" }: ChartTitleProps) {
  const titleClass = `text-lg font-bold text-foreground font-brice ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${titleClass} hover:text-brand transition-colors group flex items-center gap-1`}
      >
        {children}
        <svg
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </Link>
    );
  }

  return <h3 className={titleClass}>{children}</h3>;
}
