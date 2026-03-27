/**
 * X/Twitter Mentions Scraper for Good Vibes Club
 *
 * Scrapes X search results using multiple queries:
 *   1. "Good Vibes Club" OR @goodvibesclub — original mentions
 *   2. to:goodvibesclub — replies to the account
 *   3. url:goodvibesclub — quote tweets of the account's posts
 *
 * Merges results with existing data in src/data/x-mentions.json (dedup by tweet ID).
 *
 * Usage:
 *   npx tsx scripts/scrape-x-mentions.ts
 *
 * Prerequisites:
 *   npm install --save-dev puppeteer
 *
 * Notes:
 *   - X actively blocks automated scraping, so this may require adjustments over time.
 *   - Run manually or via cron weekly.
 *   - Always preserves existing data even if scrape fails.
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(__dirname, "../src/data/x-mentions.json");

// Multiple search queries to capture mentions, replies, and quote tweets
const SEARCH_QUERIES = [
  {
    label: "mentions",
    url: 'https://x.com/search?q=%22good%20vibes%20club%22%20OR%20%40goodvibesclub&src=typed_query&f=live',
    defaultType: "tweet" as const,
  },
  {
    label: "replies to @goodvibesclub",
    url: 'https://x.com/search?q=to%3Agoodvibesclub&src=typed_query&f=live',
    defaultType: "reply" as const,
  },
  {
    label: "quote tweets of @goodvibesclub",
    url: 'https://x.com/search?q=url%3Agoodvibesclub%20-from%3Agoodvibesclub&src=typed_query&f=live',
    defaultType: "quote" as const,
  },
];

type XMentionType = "tweet" | "reply" | "quote";

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
  type?: XMentionType;
  replyTo?: string;
  quotedHandle?: string;
}

interface DataFile {
  lastUpdated: string;
  mentions: XMention[];
}

function loadExistingData(): DataFile {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { lastUpdated: new Date().toISOString(), mentions: [] };
  }
}

function saveData(data: DataFile) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
}

function parseEngagementCount(text: string | null): number {
  if (!text) return 0;
  const cleaned = text.trim().replace(/,/g, "");
  if (cleaned.endsWith("K")) return Math.round(parseFloat(cleaned) * 1000);
  if (cleaned.endsWith("M")) return Math.round(parseFloat(cleaned) * 1000000);
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

async function scrapeTweets(): Promise<XMention[]> {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1280, height: 900 });

  const allTweets: XMention[] = [];
  const seenIds = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    console.log(`\nScraping: ${query.label}...`);

    try {
      await page.goto(query.url, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for tweet articles to appear
      try {
        await page.waitForSelector("article", { timeout: 15000 });
      } catch {
        console.warn(`  No tweets found for "${query.label}" — skipping`);
        continue;
      }

      // Scroll a few times to load more tweets
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise((r) => setTimeout(r, 2000));
      }

      const rawTweets = await extractTweetsFromPage(page);
      let added = 0;

      for (const raw of rawTweets) {
        if (seenIds.has(raw.id)) continue;
        seenIds.add(raw.id);

        // Detect type from context
        let type: XMentionType = query.defaultType;
        let replyTo: string | undefined;
        let quotedHandle: string | undefined;

        // If tweet text starts with @goodvibesclub, it's likely a reply
        if (raw.text.startsWith("@goodvibesclub") || raw.text.startsWith("@GoodVibesClub")) {
          type = "reply";
          replyTo = "goodvibesclub";
        }

        // If we found a quoted tweet indicator, mark as quote
        if (raw.hasQuotedTweet) {
          type = "quote";
          quotedHandle = "goodvibesclub";
        }

        allTweets.push({
          ...raw,
          likes: parseEngagementCount(raw.likesRaw),
          retweets: parseEngagementCount(raw.retweetsRaw),
          replies: parseEngagementCount(raw.repliesRaw),
          type,
          replyTo,
          quotedHandle,
        });
        added++;
      }

      console.log(`  Found ${rawTweets.length} tweets, ${added} new`);
    } catch (err) {
      console.warn(`  Error scraping "${query.label}":`, err);
    }
  }

  await browser.close();
  return allTweets;
}

async function extractTweetsFromPage(page: puppeteer.Page) {
  const tweets = await page.evaluate(() => {
    const articles = document.querySelectorAll("article");
    const results: Array<{
      id: string;
      authorHandle: string;
      authorDisplayName: string;
      authorAvatarUrl: string;
      text: string;
      timestamp: string;
      likes: string;
      retweets: string;
      replies: string;
      url: string;
      hasQuotedTweet: boolean;
    }> = [];

    articles.forEach((article) => {
      try {
        // Extract tweet link to get ID
        const timeEl = article.querySelector("time");
        const tweetLink = timeEl?.parentElement?.closest("a")?.getAttribute("href") || "";
        const idMatch = tweetLink.match(/\/status\/(\d+)/);
        if (!idMatch) return;

        const id = idMatch[1];

        // Author info
        const userLinks = article.querySelectorAll('a[role="link"]');
        let authorHandle = "";
        let authorDisplayName = "";
        for (const link of userLinks) {
          const href = link.getAttribute("href") || "";
          if (href.startsWith("/") && !href.includes("/status/") && href.length > 1) {
            authorHandle = href.slice(1);
            break;
          }
        }

        // Display name from first span in the user info area
        const nameSpans = article.querySelectorAll('[data-testid="User-Name"] span');
        if (nameSpans.length > 0) {
          authorDisplayName = nameSpans[0].textContent?.trim() || authorHandle;
        }

        // Avatar
        const avatarImg = article.querySelector('img[src*="profile_images"]');
        const authorAvatarUrl = avatarImg?.getAttribute("src") || "";

        // Tweet text
        const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
        const text = tweetTextEl?.textContent?.trim() || "";

        // Timestamp
        const timestamp = timeEl?.getAttribute("datetime") || "";

        // Engagement - use aria-labels from group elements
        const groups = article.querySelectorAll('[role="group"] [data-testid]');
        let replies = "0";
        let retweets = "0";
        let likes = "0";

        groups.forEach((el) => {
          const testId = el.getAttribute("data-testid") || "";
          const ariaLabel = el.getAttribute("aria-label") || "";
          const countMatch = ariaLabel.match(/^(\d[\d,]*\.?\d*[KMB]?)/);
          const count = countMatch ? countMatch[1] : "0";

          if (testId === "reply") replies = count;
          if (testId === "retweet") retweets = count;
          if (testId === "like") likes = count;
        });

        // Check for embedded/quoted tweet (indicates a quote tweet)
        const quotedTweet = article.querySelector('[data-testid="quoteTweet"]') ||
          article.querySelector('div[role="link"][tabindex="0"] > div > div > article');
        const hasQuotedTweet = !!quotedTweet;

        results.push({
          id,
          authorHandle,
          authorDisplayName: authorDisplayName || authorHandle,
          authorAvatarUrl,
          text,
          timestamp,
          likes,
          retweets,
          replies,
          url: `https://x.com${tweetLink}`,
          hasQuotedTweet,
        });
      } catch (err) {
        // Skip individual tweet errors
      }
    });

    return results;
  });

  // Map to intermediate format with raw engagement strings
  return tweets.map((t) => ({
    id: t.id,
    authorHandle: t.authorHandle,
    authorDisplayName: t.authorDisplayName,
    authorAvatarUrl: t.authorAvatarUrl,
    text: t.text,
    timestamp: t.timestamp,
    url: t.url,
    hasQuotedTweet: t.hasQuotedTweet,
    likesRaw: t.likes,
    retweetsRaw: t.retweets,
    repliesRaw: t.replies,
  }));
}

async function main() {
  console.log("=== X Mentions Scraper for Good Vibes Club ===\n");

  const existing = loadExistingData();
  const existingIds = new Set(existing.mentions.map((m) => m.id));
  console.log(`Existing data: ${existing.mentions.length} tweets\n`);

  let scraped: XMention[] = [];
  try {
    scraped = await scrapeTweets();
    const typeCounts = { tweet: 0, reply: 0, quote: 0 };
    for (const t of scraped) typeCounts[t.type || "tweet"]++;
    console.log(`\nScraped ${scraped.length} total (${typeCounts.tweet} tweets, ${typeCounts.reply} replies, ${typeCounts.quote} quotes)`);
  } catch (error) {
    console.error("Scraping failed:", error);
    console.log("Preserving existing data.");
    return;
  }

  // Merge: add new tweets, skip duplicates
  let newCount = 0;
  for (const tweet of scraped) {
    if (!existingIds.has(tweet.id)) {
      existing.mentions.push(tweet);
      existingIds.add(tweet.id);
      newCount++;
    }
  }

  // Sort by timestamp descending
  existing.mentions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  existing.lastUpdated = new Date().toISOString();

  saveData(existing);
  console.log(`\nDone! Added ${newCount} new tweets. Total: ${existing.mentions.length}`);
}

main().catch(console.error);
