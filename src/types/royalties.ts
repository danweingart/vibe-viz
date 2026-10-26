export interface RoyaltyAggregate {
  month: string;
  eth: string;
  usd: string;
  paymentCount: number;
  unpricedCount: number;
  complete: boolean;
  coveredThrough: string | null;
  updatedAt: string | null;
}

export interface RoyaltyMonth {
  month: string;
  eth: number | null;
  usd: number | null;
  paymentCount: number;
  status: "missing" | "partial" | "complete";
  coveredThrough: string | null;
  isCurrent: boolean;
  changeEth: number | null;
  changeUsd: number | null;
}

export interface RoyaltyHistory {
  status: "ready" | "awaiting_backfill" | "setup_required";
  months: RoyaltyMonth[];
  totalEth: number | null;
  totalUsd: number | null;
  completeMonths: number;
  updatedAt: string | null;
  asOf: string;
}
