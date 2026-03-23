"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui";
import {
  CommunityTable,
  AddressCell,
} from "@/components/community/CommunityTable";
// SentimentBadge available at @/components/community/SentimentBadge if needed
import {
  useCommunityHolders,
  useCommunityActivity,
  useVibestrActivity,
  useDisplayProfiles,
  useAccountTags,
  useSetAccountTag,
  useDeleteAccountTag,
} from "@/hooks/useCommunityData";
import type {
  HolderEntry,
  NewCollector,
  Accumulator,
  VibestrHolder,
  VibestrNewBuyer,
} from "@/hooks/useCommunityData";
import { formatNumber } from "@/lib/utils";

export default function CommunityPage() {
  const holders = useCommunityHolders();
  const activity = useCommunityActivity();
  const vibestr = useVibestrActivity();

  // Account tags (manual labels)
  const tagsQuery = useAccountTags();
  const tags = tagsQuery.data || {};
  const setTag = useSetAccountTag();
  const deleteTag = useDeleteAccountTag();

  const handleTag = (address: string, name: string | null) => {
    if (name) {
      setTag.mutate({ address, name });
    } else {
      deleteTag.mutate(address);
    }
  };

  // Collect all unique addresses across all data for batch name resolution
  const allAddresses = useMemo(() => {
    const addrs = new Set<string>();
    holders.data?.holders.forEach((h) => addrs.add(h.address));
    holders.data?.diamondHands.forEach((h) => addrs.add(h.address));
    activity.data?.newCollectors.forEach((c) => addrs.add(c.address));
    activity.data?.accumulators.forEach((a) => addrs.add(a.address));
    vibestr.data?.diamondHands.forEach((h) => addrs.add(h.address));
    vibestr.data?.newBuyers.forEach((b) => addrs.add(b.address));
    return Array.from(addrs);
  }, [holders.data, activity.data, vibestr.data]);

  // Lazy OpenSea/ENS resolution (fires after data loads)
  const profilesQuery = useDisplayProfiles(allAddresses);
  const profiles = profilesQuery.data || {};

  // Merged display: manual tag > auto-resolved name
  const getDisplayName = (address: string) => tags[address.toLowerCase()] || profiles[address]?.name || null;
  const isTagged = (address: string) => !!tags[address.toLowerCase()];
  const getTwitter = (address: string) => profiles[address]?.twitter || null;

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingParticles count={40} />
      <div className="fixed inset-0 bg-grid-pattern opacity-100 pointer-events-none z-0" />

      <Header />

      <main className="flex-1 relative z-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="mb-8 relative">
            <div className="absolute -top-8 -left-4 w-64 h-32 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
            <div className="relative">
              <h1 className="text-5xl font-brice text-brand mb-3 tracking-tight glowing-text relative inline-block">
                Community
                <div className="absolute inset-0 blur-[40px] bg-brand/20 animate-glow-pulse -z-10" />
              </h1>
              <p className="text-gvc-text-muted text-base sm:text-lg max-w-xl">
                Internal command center for evaluating{" "}
                <span className="text-brand font-medium">Good Vibes Club</span>{" "}
                community sentiment and strength indicators
              </p>
            </div>
          </div>

          {/* Section 01: Diamond Hands */}
          <section className="mb-8">
            <SectionHeader number="01" title="Diamond Hands" />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">GVC Holders Without Active Listings</CardTitle>
                <p className="text-xs text-gvc-text-muted mt-1">
                  Holders who have not listed their tokens on OpenSea, sorted by largest holdings
                </p>
              </CardHeader>
              <CommunityTable<HolderEntry>
                data={holders.data?.diamondHands || []}
                isLoading={holders.isLoading}
                emptyMessage="No diamond hand data available"
                columns={[
                  { key: "rank", label: "#", align: "center", width: "40px", render: (_, i) => <Rank n={i + 1} /> },
                  { key: "address", label: "Holder", render: (item) => <AddressCell address={item.address} displayName={getDisplayName(item.address)} isTagged={isTagged(item.address)} twitter={getTwitter(item.address)} onTag={handleTag} /> },
                  { key: "tokenCount", label: "Holdings", align: "right", render: (item) => <Val>{item.tokenCount}</Val> },
                  { key: "percent", label: "% Supply", align: "right", hideOnMobile: true, render: (item) => <Muted>{item.percentOfSupply.toFixed(2)}%</Muted> },
                  { key: "lastTransfer", label: "Last Transfer", align: "right", hideOnMobile: true, render: (item) => <Time ts={item.lastTransferTimestamp} /> },
                ]}
              />
            </Card>
          </section>

          {/* Section 02: Top Holders */}
          <section className="mb-8">
            <SectionHeader number="02" title="Top Holders" />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Largest GVC Token Holders</CardTitle>
                <p className="text-xs text-gvc-text-muted mt-1">
                  Wallets holding the most Good Vibes Club tokens, sorted descending
                </p>
              </CardHeader>
              <CommunityTable<HolderEntry>
                data={holders.data?.holders || []}
                isLoading={holders.isLoading}
                emptyMessage="No holder data available"
                columns={[
                  { key: "rank", label: "#", align: "center", width: "40px", render: (_, i) => <Rank n={i + 1} /> },
                  { key: "address", label: "Holder", render: (item) => <AddressCell address={item.address} displayName={getDisplayName(item.address)} isTagged={isTagged(item.address)} twitter={getTwitter(item.address)} onTag={handleTag} /> },
                  { key: "tokenCount", label: "Tokens", align: "right", render: (item) => <Val>{item.tokenCount}</Val> },
                  { key: "percent", label: "% Supply", align: "right", hideOnMobile: true, render: (item) => <Muted>{item.percentOfSupply.toFixed(2)}%</Muted> },
                  {
                    key: "listing", label: "Status", align: "center", hideOnMobile: true,
                    render: (item) => item.hasActiveListing
                      ? <Badge variant="warning" size="xs">Listed</Badge>
                      : <Badge variant="success" size="xs">Holding</Badge>,
                  },
                ]}
              />
            </Card>
          </section>

          {/* Section 03: Accumulation Leaders */}
          <section className="mb-8">
            <SectionHeader number="03" title="Accumulation Leaders" />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Buyers Without Sells</CardTitle>
                <p className="text-xs text-gvc-text-muted mt-1">
                  Most GVC purchases in the past 30 days without a single sell
                </p>
              </CardHeader>
              <CommunityTable<Accumulator>
                data={activity.data?.accumulators || []}
                isLoading={activity.isLoading}
                emptyMessage="No accumulation data available"
                columns={[
                  { key: "rank", label: "#", align: "center", width: "40px", render: (_, i) => <Rank n={i + 1} /> },
                  { key: "address", label: "Collector", render: (item) => <AddressCell address={item.address} displayName={getDisplayName(item.address)} isTagged={isTagged(item.address)} twitter={getTwitter(item.address)} onTag={handleTag} /> },
                  { key: "buys", label: "Buys", align: "right", render: (item) => <span className="font-medium text-gvc-green">{item.buysThisMonth}</span> },
                  { key: "holdings", label: "Holdings", align: "right", render: (item) => <Muted>{item.currentHoldings}</Muted> },
                ]}
              />
            </Card>
          </section>

          {/* Section 04: New GVC Collectors */}
          <section className="mb-8">
            <SectionHeader number="04" title="New Collectors" />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">First-Time GVC Buyers</CardTitle>
                <p className="text-xs text-gvc-text-muted mt-1">
                  Wallets that purchased a Good Vibes Club token for the first time, ordered by newest
                </p>
              </CardHeader>
              <CommunityTable<NewCollector>
                data={activity.data?.newCollectors || []}
                isLoading={activity.isLoading}
                emptyMessage="No new collectors in the past 30 days"
                columns={[
                  { key: "rank", label: "#", align: "center", width: "40px", render: (_, i) => <Rank n={i + 1} /> },
                  { key: "address", label: "Collector", render: (item) => <AddressCell address={item.address} displayName={getDisplayName(item.address)} isTagged={isTagged(item.address)} twitter={getTwitter(item.address)} onTag={handleTag} /> },
                  { key: "date", label: "First Purchase", align: "right", render: (item) => <Time ts={item.firstPurchaseTimestamp} /> },
                  { key: "tokens", label: "Tokens", align: "right", render: (item) => <Val>{item.tokensAcquired}</Val> },
                ]}
              />
            </Card>
          </section>

          {/* Section 05: VIBESTR Diamond Hands */}
          <section className="mb-8">
            <SectionHeader number="05" title="VIBESTR Diamond Hands" />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">VIBESTR Holders Without Recent Sells</CardTitle>
                <p className="text-xs text-gvc-text-muted mt-1">
                  VIBESTR token holders who have not sold in 30+ days, sorted by total holdings
                </p>
              </CardHeader>
              <CommunityTable<VibestrHolder>
                data={vibestr.data?.diamondHands || []}
                isLoading={vibestr.isLoading}
                emptyMessage="No VIBESTR diamond hand data available"
                columns={[
                  { key: "rank", label: "#", align: "center", width: "40px", render: (_, i) => <Rank n={i + 1} /> },
                  { key: "address", label: "Holder", render: (item) => <AddressCell address={item.address} displayName={getDisplayName(item.address)} isTagged={isTagged(item.address)} twitter={getTwitter(item.address)} onTag={handleTag} /> },
                  { key: "balance", label: "VIBESTR Balance", align: "right", render: (item) => <Val>{formatNumber(item.balance)}</Val> },
                  { key: "lastSell", label: "Last Sell", align: "right", hideOnMobile: true, render: (item) => <span className="text-gvc-text-muted text-xs">{item.lastSellTimestamp ? formatRelativeTime(item.lastSellTimestamp) : "Never"}</span> },
                ]}
              />
            </Card>
          </section>

          {/* Section 06: New VIBESTR Buyers */}
          <section className="mb-8">
            <SectionHeader number="06" title="New VIBESTR Buyers" />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">First-Time VIBESTR Purchasers</CardTitle>
                <p className="text-xs text-gvc-text-muted mt-1">
                  Wallets that purchased VIBESTR for the first time, ordered by newest
                </p>
              </CardHeader>
              <CommunityTable<VibestrNewBuyer>
                data={vibestr.data?.newBuyers || []}
                isLoading={vibestr.isLoading}
                emptyMessage="No new VIBESTR buyers in the past 30 days"
                columns={[
                  { key: "rank", label: "#", align: "center", width: "40px", render: (_, i) => <Rank n={i + 1} /> },
                  { key: "address", label: "Buyer", render: (item) => <AddressCell address={item.address} displayName={getDisplayName(item.address)} isTagged={isTagged(item.address)} twitter={getTwitter(item.address)} onTag={handleTag} /> },
                  { key: "date", label: "First Buy", align: "right", render: (item) => <Time ts={item.firstBuyTimestamp} /> },
                  { key: "amount", label: "Amount", align: "right", render: (item) => <Val>{formatNumber(item.amountPurchased)}</Val> },
                ]}
              />
            </Card>
          </section>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}

// Tiny helper components to reduce inline JSX noise
function Rank({ n }: { n: number }) {
  return <span className="text-gvc-text-muted text-xs">{n}</span>;
}
function Val({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-gvc-text">{children}</span>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-gvc-text-muted">{children}</span>;
}
function Time({ ts }: { ts: number | null }) {
  return (
    <span className="text-gvc-text-muted text-xs">
      {ts ? formatRelativeTime(ts) : "\u2014"}
    </span>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 sticky top-[120px] z-30 py-2 -mx-1 px-1 bg-gvc-bg/80 backdrop-blur-md">
      <span className="text-[11px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20 uppercase tracking-wider">
        {number}
      </span>
      <h2 className="text-3xl font-brice text-gvc-text tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gvc-border via-gvc-border/50 to-transparent" />
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-gvc-card border border-gvc-border backdrop-blur-md flex items-center justify-center text-gvc-text-muted hover:text-brand hover:border-brand/50 transition-all shadow-lg"
      aria-label="Back to top"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}
