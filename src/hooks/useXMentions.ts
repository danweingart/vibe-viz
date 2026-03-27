"use client";

import { useQuery } from "@tanstack/react-query";

export type XMentionType = "tweet" | "reply" | "quote";

export interface XMention {
  id: string;
  authorHandle: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  text: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  url: string;
  type?: XMentionType;
  /** For replies: the handle being replied to */
  replyTo?: string;
  /** For quote tweets: the handle being quoted */
  quotedHandle?: string;
}

export interface WeeklyVolume {
  week: string;
  weekStart: string;
  count: number;
}

export interface TopMentioner {
  handle: string;
  displayName: string;
  avatarUrl: string;
  count: number;
  totalEngagement: number;
}

export interface XMentionsResponse {
  mentions: XMention[];
  weeklyVolume: WeeklyVolume[];
  topMentioners: TopMentioner[];
  stats: {
    totalMentions: number;
    uniqueAccounts: number;
    avgLikes: number;
    avgRetweets: number;
    lastUpdated: string;
  };
}

async function fetchXMentions(): Promise<XMentionsResponse> {
  const response = await fetch("/api/community/x-mentions");
  if (!response.ok) throw new Error("Failed to fetch X mentions");
  return response.json();
}

export function useXMentions() {
  return useQuery({
    queryKey: ["x-mentions"],
    queryFn: fetchXMentions,
    staleTime: 30 * 60 * 1000, // 30 min (data changes weekly)
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}
