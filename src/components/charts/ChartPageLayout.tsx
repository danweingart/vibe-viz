"use client";

import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { ChartSettingsProvider } from "@/providers/ChartSettingsProvider";
import { ChartControls } from "@/components/dashboard";

interface ChartPageLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ChartPageLayout({ title, description, children }: ChartPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm">
            <Link href="/" className="text-foreground-muted hover:text-foreground">
              Dashboard
            </Link>
            <span className="mx-2 text-foreground-muted">/</span>
            <span className="text-foreground">{title}</span>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl font-brice text-foreground mb-1">{title}</h1>
            <p className="text-foreground-muted text-sm">{description}</p>
          </div>

          <ChartSettingsProvider>
            <div className="mb-4">
              <ChartControls />
            </div>
            {/* Chart container - centered 1:1 tile */}
            <div className="mx-auto max-w-[600px]">
              {children}
            </div>
          </ChartSettingsProvider>
        </div>
      </main>

      <Footer />
    </div>
  );
}
