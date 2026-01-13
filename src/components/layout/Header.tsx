"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { formatTimeAgo } from "@/lib/utils";

interface HeaderProps {
  lastUpdated?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ lastUpdated, onRefresh, isRefreshing }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 rounded-full bg-brand flex items-center justify-center p-1.5 shadow-lg shadow-brand/20 group-hover:shadow-brand/30 transition-shadow">
              <Image
                src="/images/shaka.png"
                alt="Good Vibes Club"
                width={28}
                height={28}
                className="invert group-hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <h1 className="font-brice text-lg text-foreground leading-none tracking-tight group-hover:text-brand transition-colors">
                Good Vibes Club
              </h1>
              <p className="text-[11px] text-foreground-subtle uppercase tracking-wider">Analytics</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/" active={pathname === "/"}>
              Collection
            </NavLink>
            <a
              href="https://www.nftstrategy.fun/strategies/0xd0cc2b0efb168bfe1f94a948d8df70fa10257196"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-all duration-200 px-4 py-2 rounded-full text-background bg-brand shadow-sm shadow-brand/20 hover:shadow-brand/30"
            >
              VIBESTR ↗
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="hidden sm:block text-xs text-foreground-muted">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                isLoading={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-foreground-muted hover:text-foreground active:scale-95"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              <MobileNavLink href="/" onClick={() => setMobileMenuOpen(false)} active={pathname === "/"}>
                Collection
              </MobileNavLink>
              <a
                href="https://www.nftstrategy.fun/strategies/0xd0cc2b0efb168bfe1f94a948d8df70fa10257196"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base font-medium rounded-xl active:scale-[0.98] transition-all text-background bg-brand shadow-sm"
              >
                VIBESTR ↗
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-all duration-200 px-4 py-2 rounded-full ${
        active
          ? "text-background bg-brand shadow-sm shadow-brand/20"
          : "text-foreground-muted hover:text-foreground hover:bg-border/50"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
  active,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-4 py-3 text-base font-medium rounded-xl active:scale-[0.98] transition-all ${
        active
          ? "text-background bg-brand shadow-sm"
          : "text-foreground-muted hover:text-foreground hover:bg-border/50"
      }`}
    >
      {children}
    </Link>
  );
}
