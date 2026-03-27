"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui";
import type { XMention } from "@/hooks/useXMentions";

interface XMentionsFeedProps {
  mentions: XMention[] | undefined;
  isLoading: boolean;
  lastUpdated?: string;
}

function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(isoTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function HeartIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TweetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3 border-b border-gvc-border/30">
          <div className="w-8 h-8 rounded-full bg-gvc-border/50 animate-shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gvc-border/50 rounded animate-shimmer w-32" />
            <div className="h-3 bg-gvc-border/50 rounded animate-shimmer w-full" />
            <div className="h-3 bg-gvc-border/50 rounded animate-shimmer w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function XMentionsFeed({ mentions, isLoading, lastUpdated }: XMentionsFeedProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Recent Mentions</CardTitle>
            <p className="text-xs text-gvc-text-muted mt-1">
              Tweets, replies, and quote tweets about Good Vibes Club
            </p>
          </div>
          {lastUpdated && (
            <span className="text-[10px] text-gvc-text-muted bg-gvc-border/30 px-2 py-0.5 rounded-md">
              Updated {formatRelativeTime(lastUpdated)}
            </span>
          )}
        </div>
      </CardHeader>
      <div className="px-4 pb-4">
        {isLoading ? (
          <TweetSkeleton />
        ) : !mentions || mentions.length === 0 ? (
          <div className="text-center py-8 text-gvc-text-muted text-sm">
            No mentions found
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto space-y-0 pr-1 scrollbar-thin">
            {mentions.slice(0, 15).map((tweet) => (
              <a
                key={tweet.id}
                href={tweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 py-3 border-b border-gvc-border/30 hover:bg-gvc-border/10 transition-colors -mx-1 px-1 rounded group"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gvc-border/60 flex items-center justify-center shrink-0 overflow-hidden">
                  {tweet.authorAvatarUrl ? (
                    <img
                      src={tweet.authorAvatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gvc-text-muted">
                      <XIcon />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gvc-text group-hover:text-brand transition-colors truncate">
                      {tweet.authorDisplayName}
                    </span>
                    <span className="text-[10px] text-gvc-text-muted truncate">
                      @{tweet.authorHandle}
                    </span>
                    <span className="text-[10px] text-gvc-text-muted shrink-0">
                      {formatRelativeTime(tweet.timestamp)}
                    </span>
                    {tweet.type === "reply" && (
                      <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider font-medium">
                        Reply
                      </span>
                    )}
                    {tweet.type === "quote" && (
                      <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider font-medium">
                        Quote
                      </span>
                    )}
                  </div>
                  {tweet.type === "reply" && tweet.replyTo && (
                    <p className="text-[10px] text-blue-400/70 mb-0.5">
                      Replying to @{tweet.replyTo}
                    </p>
                  )}
                  {tweet.type === "quote" && tweet.quotedHandle && (
                    <p className="text-[10px] text-purple-400/70 mb-0.5">
                      Quoting @{tweet.quotedHandle}
                    </p>
                  )}
                  <p className="text-xs text-gvc-text-muted leading-relaxed line-clamp-2">
                    {tweet.text}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-gvc-text-muted">
                      <HeartIcon /> {tweet.likes}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-gvc-text-muted">
                      <RetweetIcon /> {tweet.retweets}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-gvc-text-muted">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {tweet.replies}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
