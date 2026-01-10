"use client";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui";

export default function VibestrPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        <Card className="flex flex-col items-center justify-center py-24">
          <h1 className="font-brice text-4xl text-brand mb-4">VIBESTR</h1>
          <p className="text-xl text-foreground-muted mb-2">Coming Soon</p>
          <p className="text-sm text-foreground-muted/60">Stay tuned for something exciting</p>
        </Card>
      </main>
    </div>
  );
}
