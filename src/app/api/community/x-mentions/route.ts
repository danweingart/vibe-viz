import { NextResponse } from "next/server";
import { cache } from "@/lib/cache/postgres";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

interface XMention {
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
  type?: "tweet" | "reply" | "quote";
  replyTo?: string;
  quotedHandle?: string;
}

interface WeeklyVolume {
  week: string;
  weekStart: string;
  count: number;
}

interface TopMentioner {
  handle: string;
  displayName: string;
  avatarUrl: string;
  count: number;
  totalEngagement: number;
}

interface XMentionsResponse {
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

const CACHE_KEY = "x-mentions";
const CACHE_TTL = 3600; // 1 hour

function computeWeeklyVolume(mentions: XMention[]): WeeklyVolume[] {
  const weekMap = new Map<string, { weekStart: string; count: number }>();

  for (const m of mentions) {
    const date = new Date(m.timestamp);
    // Get Monday of this week
    const day = date.getUTCDay();
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setUTCDate(diff);
    monday.setUTCHours(0, 0, 0, 0);

    const key = monday.toISOString().split("T")[0];
    const label = monday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    const existing = weekMap.get(key) || { weekStart: key, count: 0 };
    existing.count++;
    weekMap.set(key, existing);
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      week: new Date(v.weekStart).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      weekStart: v.weekStart,
      count: v.count,
    }));
}

function computeTopMentioners(mentions: XMention[]): TopMentioner[] {
  const map = new Map<
    string,
    { displayName: string; avatarUrl: string; count: number; totalEngagement: number }
  >();

  for (const m of mentions) {
    const existing = map.get(m.authorHandle) || {
      displayName: m.authorDisplayName,
      avatarUrl: m.authorAvatarUrl,
      count: 0,
      totalEngagement: 0,
    };
    existing.count++;
    existing.totalEngagement += m.likes + m.retweets;
    map.set(m.authorHandle, existing);
  }

  return Array.from(map.entries())
    .map(([handle, v]) => ({ handle, ...v }))
    .sort((a, b) => b.count - a.count || b.totalEngagement - a.totalEngagement);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  return withTimeout(
    async () => {
      try {
        if (!forceRefresh) {
          const cached = await cache.get<XMentionsResponse>(CACHE_KEY);
          if (cached) {
            return NextResponse.json(cached);
          }
        }

        // Read static JSON data file
        const dataPath = path.join(process.cwd(), "src/data/x-mentions.json");
        const raw = fs.readFileSync(dataPath, "utf-8");
        const { lastUpdated, mentions } = JSON.parse(raw) as {
          lastUpdated: string;
          mentions: XMention[];
        };

        // Sort by most recent first
        const sorted = [...mentions].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const totalLikes = sorted.reduce((s, m) => s + m.likes, 0);
        const totalRetweets = sorted.reduce((s, m) => s + m.retweets, 0);
        const uniqueHandles = new Set(sorted.map((m) => m.authorHandle));

        const result: XMentionsResponse = {
          mentions: sorted,
          weeklyVolume: computeWeeklyVolume(sorted),
          topMentioners: computeTopMentioners(sorted),
          stats: {
            totalMentions: sorted.length,
            uniqueAccounts: uniqueHandles.size,
            avgLikes: sorted.length > 0 ? Math.round(totalLikes / sorted.length) : 0,
            avgRetweets: sorted.length > 0 ? Math.round(totalRetweets / sorted.length) : 0,
            lastUpdated,
          },
        };

        await cache.set(CACHE_KEY, result, CACHE_TTL);
        return NextResponse.json(result);
      } catch (error) {
        console.error("Error fetching X mentions:", error);

        const staleCache = await cache.get<XMentionsResponse>(CACHE_KEY, true);
        if (staleCache) {
          return NextResponse.json(staleCache);
        }

        return NextResponse.json(
          { error: "Failed to fetch X mentions" },
          { status: 500 }
        );
      }
    },
    timeoutWithCache(async () => {
      return await cache.get<XMentionsResponse>(CACHE_KEY, true);
    })
  );
}
