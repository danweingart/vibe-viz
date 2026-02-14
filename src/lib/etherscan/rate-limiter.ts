/**
 * Global Rate Limiter for Etherscan API
 *
 * Ensures all API routes respect the 3 calls/sec limit across the entire application.
 * This prevents rate limit errors when multiple routes are called in parallel.
 */

class GlobalRateLimiter {
  private lastCallTime = 0;
  private readonly minInterval: number;
  private queue: Array<() => void> = [];
  private processing = false;

  constructor(callsPerSecond: number) {
    // Add extra margin for safety (use 2.5 calls/sec for 3 calls/sec limit)
    this.minInterval = 1000 / (callsPerSecond * 0.85);
  }

  /**
   * Wait for rate limit, ensuring global coordination across all API calls
   */
  async wait(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    const delay = Math.max(0, this.minInterval - timeSinceLastCall);

    setTimeout(() => {
      this.lastCallTime = Date.now();
      const resolve = this.queue.shift();
      this.processing = false;

      if (resolve) {
        resolve();
      }

      // Process next item in queue
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, delay);
  }

  /**
   * Get queue statistics for monitoring
   */
  getStats(): { queueLength: number; lastCallTime: number } {
    return {
      queueLength: this.queue.length,
      lastCallTime: this.lastCallTime,
    };
  }
}

// Singleton instance for global coordination
// Etherscan free tier: 5 calls/sec, we use 3.0 (60% of limit) for safety with better performance
// This allows multiple routes to run concurrently without hitting the limit
// Conservative 40% buffer from rate limits while providing 3x speedup over 1.0 calls/sec
export const globalRateLimiter = new GlobalRateLimiter(3.0);
