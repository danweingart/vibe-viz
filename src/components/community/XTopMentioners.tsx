"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui";
import { CommunityTable } from "@/components/community/CommunityTable";
import type { TopMentioner } from "@/hooks/useXMentions";

interface XTopMentionersProps {
  data: TopMentioner[] | undefined;
  isLoading: boolean;
}

function Rank({ n }: { n: number }) {
  return <span className="text-gvc-text-muted text-xs">{n}</span>;
}

export function XTopMentioners({ data, isLoading }: XTopMentionersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Top Mentioners</CardTitle>
        <p className="text-xs text-gvc-text-muted mt-1">
          Most active accounts tweeting about GVC
        </p>
      </CardHeader>
      <CommunityTable<TopMentioner>
        data={data || []}
        isLoading={isLoading}
        emptyMessage="No mentioner data available"
        maxRows={10}
        columns={[
          {
            key: "rank",
            label: "#",
            align: "center",
            width: "40px",
            render: (_, i) => <Rank n={i + 1} />,
          },
          {
            key: "handle",
            label: "Account",
            render: (item) => (
              <a
                href={`https://x.com/${item.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 group"
              >
                <div className="w-6 h-6 rounded-full bg-gvc-border/60 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.avatarUrl ? (
                    <img
                      src={item.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-3 h-3 text-gvc-text-muted" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-gvc-text group-hover:text-brand transition-colors font-medium text-xs truncate block">
                    @{item.handle}
                  </span>
                  <span className="text-[10px] text-gvc-text-muted truncate block">
                    {item.displayName}
                  </span>
                </div>
              </a>
            ),
          },
          {
            key: "count",
            label: "Tweets",
            align: "right",
            render: (item) => (
              <span className="font-medium text-gvc-text">{item.count}</span>
            ),
          },
          {
            key: "engagement",
            label: "Engagement",
            align: "right",
            hideOnMobile: true,
            render: (item) => (
              <span className="text-gvc-text-muted text-xs">
                {item.totalEngagement.toLocaleString()}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}
