/**
 * Database Connection Utilities
 *
 * Provides retry logic and error handling for Vercel Postgres operations.
 * Vercel Postgres automatically handles connection pooling, but we add:
 * - Retry logic with exponential backoff for transient failures
 * - Connection timeout handling
 * - Detailed error logging for debugging
 *
 * This prevents "connection pool exhausted" and transient network errors
 * from breaking the application.
 */

import { sql } from "@vercel/postgres";

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 2,
  initialDelay: 100, // ms
  maxDelay: 2000, // ms
  timeout: 4000, // 4 seconds (must fit within Vercel Hobby 10s limit)
};

/**
 * Execute a database query with retry logic
 *
 * @param operation - Async function that performs the database operation
 * @param config - Retry configuration
 * @returns Result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, timeout } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout to prevent hanging
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Database operation timeout")), timeout)
        ),
      ]);

      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable =
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("pool") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("connection");

      if (!isRetryable) {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
        errorMessage
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  console.error(`Database operation failed after ${maxRetries + 1} attempts:`, lastError);
  throw lastError || new Error("Database operation failed");
}

/**
 * Safe query wrapper with automatic retry
 *
 * @param query - SQL query template
 * @param config - Retry configuration
 * @returns Query result
 */
export async function safeQuery<T = any>(
  queryFn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  return withRetry(queryFn, config);
}

/**
 * Health check - verify database connection
 *
 * @returns true if connection is healthy
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await withRetry(
      async () => {
        const result = await sql`SELECT 1 AS health_check`;
        return result.rows[0].health_check === 1;
      },
      { maxRetries: 1, timeout: 5000 }
    );
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

/**
 * Get connection pool stats (if available)
 *
 * Note: Vercel Postgres doesn't expose pool stats directly,
 * but we can track operation success/failure rates
 */
let operationStats = {
  totalOperations: 0,
  successfulOperations: 0,
  failedOperations: 0,
  lastReset: Date.now(),
};

export function trackDatabaseOperation(success: boolean): void {
  operationStats.totalOperations++;
  if (success) {
    operationStats.successfulOperations++;
  } else {
    operationStats.failedOperations++;
  }

  // Reset stats every hour
  if (Date.now() - operationStats.lastReset > 3600000) {
    operationStats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastReset: Date.now(),
    };
  }
}

export function getDatabaseStats(): {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
} {
  const successRate =
    operationStats.totalOperations > 0
      ? (operationStats.successfulOperations / operationStats.totalOperations) * 100
      : 100;

  return {
    ...operationStats,
    successRate,
  };
}
