"use client";

import { Card } from "@/components/ui";
import { useTokenPriceHistory } from "@/hooks/vibestr";
import { formatEth, formatUsd, formatNumber } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_MARGINS } from "@/lib/chartConfig";

// Chart colors from constants
const CHART_COLORS = {
  primary: "#ffe048",
  info: "#60a5fa",
  success: "#34d399",
  danger: "#f87171",
};

export function PriceVolumeChart() {
  const { data: priceHistory, isLoading, error } = useTokenPriceHistory();

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="font-brice text-xl text-foreground mb-4">
          Price & Volume History
        </h2>
        <div className="h-[280px] bg-background-tertiary animate-pulse rounded-lg" />
      </Card>
    );
  }

  if (error || !priceHistory || priceHistory.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="font-brice text-xl text-foreground mb-4">
          Price & Volume History
        </h2>
        <div className="rounded-lg border border-danger/50 bg-danger/10 p-4 text-center">
          <p className="text-danger text-sm">No price history data available</p>
        </div>
      </Card>
    );
  }

  // Format data for chart
  const chartData = priceHistory.map((point) => ({
    date: new Date(point.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: point.priceUsd,
    volume: point.volumeUsd / 1000, // Convert to thousands for readability
    marketCap: point.marketCap,
  }));

  // Calculate stats
  const latestPoint = priceHistory[priceHistory.length - 1];
  const earliestPoint = priceHistory[0];
  const priceChange =
    ((latestPoint.priceUsd - earliestPoint.priceUsd) / earliestPoint.priceUsd) * 100;
  const totalVolume = priceHistory.reduce((sum, p) => sum + p.volumeUsd, 0);

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-brice text-xl text-foreground mb-3">
          Price & Volume History
        </h2>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-background-tertiary border border-border">
            <div className="text-[10px] text-foreground-muted mb-1">Current Price</div>
            <div className="font-mundial-bold text-sm text-foreground">
              {formatUsd(latestPoint.priceUsd, 4)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background-tertiary border border-border">
            <div className="text-[10px] text-foreground-muted mb-1">Price Change</div>
            <div
              className={`font-mundial-bold text-sm ${
                priceChange >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)}%
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background-tertiary border border-border">
            <div className="text-[10px] text-foreground-muted mb-1">Total Volume</div>
            <div className="font-mundial-bold text-sm text-foreground">
              {formatUsd(totalVolume, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={CHART_MARGINS.default}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="#999"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              yAxisId="left"
              stroke={CHART_COLORS.primary}
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => `$${value.toFixed(4)}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={CHART_COLORS.info}
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => `$${value}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0c0c0c",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                if (!value || !name) return ["N/A", ""];
                if (name === "Price") return [formatUsd(value, 4), name];
                if (name === "Volume") return [formatUsd(value * 1000, 0), name];
                return [value, name];
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="line"
            />
            <Bar
              yAxisId="right"
              dataKey="volume"
              name="Volume"
              fill={CHART_COLORS.info}
              opacity={0.6}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="price"
              name="Price"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.primary, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Note */}
      <div className="text-[10px] text-foreground-muted/60 text-center pt-4 border-t border-border/50 mt-4">
        * Limited history available ({priceHistory.length} days). Full historical data coming soon.
      </div>
    </Card>
  );
}
