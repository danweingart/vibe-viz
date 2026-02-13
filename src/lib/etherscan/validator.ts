/**
 * Etherscan Data Validation Layer
 *
 * Cross-references data sources to ensure accuracy and detect issues.
 * Validates that Etherscan (source of truth) and OpenSea (price enrichment)
 * are in sync and flags discrepancies.
 */

export interface ValidationResult {
  passed: boolean;
  coverage: number;
  warning: string | null;
  metric?: {
    etherscan: number;
    openSea?: number;
    discrepancy?: number;
  };
}

// Validation thresholds
// Note: Lower price coverage threshold accounts for P2P transfers and
// non-OpenSea marketplace sales that won't have price data
const THRESHOLDS = {
  MIN_PRICE_COVERAGE: 0.50,      // Warn if <50% transfers have prices (P2P + other marketplaces)
  MAX_TRANSFER_DISCREPANCY: 0.10, // Warn if >10% difference in counts
  MAX_HOLDER_DISCREPANCY: 0.05,   // Warn if >5% difference in holders
};

/**
 * Validate price enrichment coverage
 *
 * Checks what percentage of Etherscan transfers were successfully enriched
 * with OpenSea price data. Low coverage indicates missing marketplace data
 * or API issues.
 *
 * @param enrichedCount - Number of transfers with prices
 * @param totalTransfers - Total number of transfers
 * @returns Validation result with coverage percentage
 */
export function validatePriceCoverage(
  enrichedCount: number,
  totalTransfers: number
): ValidationResult {
  if (totalTransfers === 0) {
    return {
      passed: true,
      coverage: 1,
      warning: null,
    };
  }

  const coverage = enrichedCount / totalTransfers;
  const passed = coverage >= THRESHOLDS.MIN_PRICE_COVERAGE;

  return {
    passed,
    coverage,
    warning: !passed
      ? `Price coverage at ${(coverage * 100).toFixed(1)}% - expected ≥${(THRESHOLDS.MIN_PRICE_COVERAGE * 100).toFixed(0)}% (P2P transfers + other marketplaces account for missing prices)`
      : null,
    metric: {
      etherscan: totalTransfers,
      openSea: enrichedCount,
      discrepancy: 1 - coverage,
    },
  };
}

/**
 * Validate transfer count coverage
 *
 * Compares Etherscan transfer count vs enriched sales count to ensure
 * we're not missing transactions during the enrichment process.
 *
 * @param etherscanTransfers - Number of transfers from Etherscan
 * @param enrichedSales - Number of successfully enriched sales
 * @returns Validation result
 */
export function validateTransferCoverage(
  etherscanTransfers: number,
  enrichedSales: number
): ValidationResult {
  if (etherscanTransfers === 0) {
    return {
      passed: true,
      coverage: 1,
      warning: null,
    };
  }

  const coverage = enrichedSales / etherscanTransfers;
  const discrepancy = Math.abs(1 - coverage);
  const passed = discrepancy <= THRESHOLDS.MAX_TRANSFER_DISCREPANCY;

  return {
    passed,
    coverage,
    warning: !passed
      ? `Transfer coverage at ${(coverage * 100).toFixed(1)}% - expected ≥${((1 - THRESHOLDS.MAX_TRANSFER_DISCREPANCY) * 100).toFixed(0)}%`
      : null,
    metric: {
      etherscan: etherscanTransfers,
      openSea: enrichedSales,
      discrepancy,
    },
  };
}

/**
 * Validate holder count accuracy
 *
 * Compares Etherscan holder count (from transfer replay) vs OpenSea holder
 * count (from their API). Small discrepancies are expected due to timing,
 * but large differences indicate data quality issues.
 *
 * @param etherscanHolders - Holder count from Etherscan transfer replay
 * @param openSeaHolders - Holder count from OpenSea API
 * @returns Validation result
 */
export function validateHolderCount(
  etherscanHolders: number,
  openSeaHolders: number
): ValidationResult {
  if (etherscanHolders === 0 && openSeaHolders === 0) {
    return {
      passed: true,
      coverage: 1,
      warning: null,
    };
  }

  // Use Etherscan as baseline (source of truth)
  const discrepancy = Math.abs(etherscanHolders - openSeaHolders) / etherscanHolders;
  const passed = discrepancy <= THRESHOLDS.MAX_HOLDER_DISCREPANCY;

  return {
    passed,
    coverage: 1 - discrepancy,
    warning: !passed
      ? `Holder count discrepancy: ${(discrepancy * 100).toFixed(1)}% (Etherscan=${etherscanHolders} OpenSea=${openSeaHolders})`
      : null,
    metric: {
      etherscan: etherscanHolders,
      openSea: openSeaHolders,
      discrepancy,
    },
  };
}

/**
 * Log validation metrics to console
 *
 * Outputs validation results in a consistent format for monitoring.
 * Warnings are logged at WARN level, successful validations at INFO level.
 *
 * @param context - Context string (e.g., "Events API", "Price History")
 * @param validations - Array of validation results to log
 */
export function logValidationMetrics(
  context: string,
  validations: Array<{ label: string; result: ValidationResult }>
): void {
  for (const { label, result } of validations) {
    const prefix = `[${context}] ${label}:`;

    if (result.warning) {
      console.warn(`${prefix} ${result.warning}`);
    } else {
      const coveragePercent = (result.coverage * 100).toFixed(1);
      console.log(`${prefix} ${coveragePercent}% - OK`);
    }

    // Log detailed metrics if available
    if (result.metric) {
      console.log(`  └─ Etherscan: ${result.metric.etherscan}, OpenSea: ${result.metric.openSea || 'N/A'}, Discrepancy: ${((result.metric.discrepancy || 0) * 100).toFixed(1)}%`);
    }
  }
}

/**
 * Validate overall data quality
 *
 * Runs all validation checks and returns a summary. Useful for health checks
 * and monitoring dashboards.
 *
 * @param data - Data to validate
 * @returns Overall validation summary
 */
export function validateDataQuality(data: {
  totalTransfers: number;
  enrichedTransfers: number;
  etherscanHolders?: number;
  openSeaHolders?: number;
}): {
  allPassed: boolean;
  results: Array<{ label: string; result: ValidationResult }>;
} {
  const results: Array<{ label: string; result: ValidationResult }> = [];

  // Price coverage validation
  results.push({
    label: "Price Coverage",
    result: validatePriceCoverage(data.enrichedTransfers, data.totalTransfers),
  });

  // Transfer coverage validation
  results.push({
    label: "Transfer Coverage",
    result: validateTransferCoverage(data.totalTransfers, data.enrichedTransfers),
  });

  // Holder count validation (if data available)
  if (data.etherscanHolders !== undefined && data.openSeaHolders !== undefined) {
    results.push({
      label: "Holder Count",
      result: validateHolderCount(data.etherscanHolders, data.openSeaHolders),
    });
  }

  const allPassed = results.every(r => r.result.passed);

  return {
    allPassed,
    results,
  };
}
