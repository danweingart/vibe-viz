/**
 * Request Timeout Middleware
 *
 * Prevents API routes from running indefinitely and timing out at the Vercel limit.
 * Adds graceful timeout handling with partial/cached result fallbacks.
 *
 * Vercel Limits:
 * - Hobby tier: 10s for serverless functions
 * - Pro tier: 60s for serverless functions
 *
 * We set timeout at 25s (well before pro limit) to:
 * - Return partial results before hitting hard timeout
 * - Give clear error messages instead of cryptic timeout errors
 * - Allow fallback to cached/stale data
 */

import { NextResponse } from "next/server";

export const REQUEST_TIMEOUT = 25000; // 25 seconds
export const TIMEOUT_WARNING = 20000; // 20 seconds (warn 5s before timeout)

interface TimeoutConfig {
  timeout?: number;
  warningTime?: number;
  onTimeout?: () => Promise<Response | null>;
  enableWarning?: boolean;
}

/**
 * Wrap an API route handler with timeout protection
 *
 * @param handler - Async function that handles the request
 * @param config - Timeout configuration
 * @returns Response or timeout error
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   return withTimeout(async () => {
 *     const data = await fetchExpensiveData();
 *     return NextResponse.json(data);
 *   }, {
 *     onTimeout: async () => {
 *       const cached = await getCachedData();
 *       return NextResponse.json({ ...cached, _timeout: true });
 *     }
 *   });
 * }
 */
export async function withTimeout(
  handler: () => Promise<Response>,
  config: TimeoutConfig = {}
): Promise<Response> {
  const {
    timeout = REQUEST_TIMEOUT,
    warningTime = TIMEOUT_WARNING,
    onTimeout,
    enableWarning = true,
  } = config;

  let timeoutWarningLogged = false;
  let warningTimer: NodeJS.Timeout | null = null;

  // Set up warning timer
  if (enableWarning && warningTime < timeout) {
    warningTimer = setTimeout(() => {
      timeoutWarningLogged = true;
      console.warn(
        `Request approaching timeout (${warningTime}ms elapsed, ${timeout}ms limit)`
      );
    }, warningTime);
  }

  try {
    // Race between handler and timeout
    const result = await Promise.race([
      handler(),
      new Promise<Response>(async (_, reject) => {
        setTimeout(async () => {
          // Timeout occurred - try fallback first
          if (onTimeout) {
            try {
              const fallbackResponse = await onTimeout();
              if (fallbackResponse) {
                console.warn(`Request timed out after ${timeout}ms, returning fallback`);
                return fallbackResponse;
              }
            } catch (error) {
              console.error("Timeout fallback failed:", error);
            }
          }

          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      }),
    ]);

    // Clear warning timer if request completed
    if (warningTimer) {
      clearTimeout(warningTimer);
    }

    return result;
  } catch (error) {
    // Clear warning timer on error
    if (warningTimer) {
      clearTimeout(warningTimer);
    }

    // Check if this was a timeout error
    if (error instanceof Error && error.message.includes("timeout")) {
      return NextResponse.json(
        {
          error: "Request timeout",
          message: `Operation took longer than ${timeout}ms. Try reducing the date range or using cached data.`,
          timeout: true,
        },
        { status: 504 } // Gateway Timeout
      );
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Create a timeout handler with cached fallback
 *
 * @param getCached - Function to retrieve cached/stale data
 * @returns Timeout config with onTimeout handler
 *
 * @example
 * export async function GET() {
 *   return withTimeout(
 *     async () => {
 *       const data = await fetchFreshData();
 *       return NextResponse.json(data);
 *     },
 *     timeoutWithCache(async () => {
 *       const cached = await cache.get('my-key', true);
 *       return cached;
 *     })
 *   );
 * }
 */
export function timeoutWithCache<T>(
  getCached: () => Promise<T | null>
): TimeoutConfig {
  return {
    onTimeout: async () => {
      try {
        const cached = await getCached();
        if (cached) {
          return NextResponse.json({
            ...cached,
            _timeout: true,
            _stale: true,
            message: "Request timed out, returning cached data",
          });
        }
      } catch (error) {
        console.error("Failed to retrieve cached data on timeout:", error);
      }
      return null;
    },
  };
}

/**
 * Check if we're approaching timeout and should abort
 *
 * @param startTime - Request start time in milliseconds
 * @param timeoutMs - Timeout limit in milliseconds
 * @returns true if we should abort to avoid timeout
 */
export function isApproachingTimeout(
  startTime: number,
  timeoutMs: number = REQUEST_TIMEOUT
): boolean {
  const elapsed = Date.now() - startTime;
  const remaining = timeoutMs - elapsed;
  const warningThreshold = timeoutMs * 0.8; // 80% of timeout

  return elapsed > warningThreshold;
}

/**
 * Get remaining time before timeout
 *
 * @param startTime - Request start time in milliseconds
 * @param timeoutMs - Timeout limit in milliseconds
 * @returns Remaining time in milliseconds
 */
export function getRemainingTime(
  startTime: number,
  timeoutMs: number = REQUEST_TIMEOUT
): number {
  const elapsed = Date.now() - startTime;
  return Math.max(0, timeoutMs - elapsed);
}
