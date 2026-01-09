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
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand flex items-center justify-center p-1.5">
              <Image
                src="/images/shaka.png"
                alt="Good Vibes Club"
                width={28}
                height={28}
                className="invert"
              />
            </div>
            <div>
              <h1 className="font-brice text-lg text-foreground leading-none">
                Good Vibes Club
              </h1>
              <p className="text-xs text-foreground-muted">Analytics</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/" active={pathname === "/"}>
              Dashboard
            </NavLink>
            <NavLink href="/holders" active={pathname === "/holders"}>
              Holders
            </NavLink>
            <NavLink href="/sales" active={pathname === "/sales"}>
              Sales
            </NavLink>
            <NavLink href="/whales" active={pathname === "/whales"}>
              Whales
            </NavLink>
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
              className="md:hidden p-2 text-foreground-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/holders" onClick={() => setMobileMenuOpen(false)} active={pathname === "/holders"}>
                Holders
              </MobileNavLink>
              <MobileNavLink href="/sales" onClick={() => setMobileMenuOpen(false)} active={pathname === "/sales"}>
                Sales
              </MobileNavLink>
              <MobileNavLink href="/whales" onClick={() => setMobileMenuOpen(false)} active={pathname === "/whales"}>
                Whales
              </MobileNavLink>
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
      className={`text-sm font-medium transition-all px-3 py-1.5 rounded-lg ${
        active
          ? "text-brand bg-brand/10 nav-link-active"
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
      className={`block px-3 py-2 text-base font-medium rounded-lg ${
        active
          ? "text-brand bg-brand/10"
          : "text-foreground-muted hover:text-foreground hover:bg-border"
      }`}
    >
      {children}
    </Link>
  );
}
