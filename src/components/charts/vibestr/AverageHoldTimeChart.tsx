"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartStatCard, ChartStatGrid } from "@/components/ui";
import {
  StandardChartCard,
  LegendItem,
} from "@/components/charts/StandardChartCard";
import { useVolumeHistory } from "@/hooks/vibestr";
import { useChartSettings } from "@/providers/ChartSettingsProvider";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  getTooltipContentStyle,
} from "@/lib/chartConfig";
import { getChartFilename } from "@/lib/chartExport";

export function AverageHoldTimeChart() {
  const { timeRange } = useChartSettings();
  const { data, isLoading, error } = useVolumeHistory(timeRange);

  // Track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({
    holdTime: true,
  });

  const handleLegendToggle = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // Calculate hold time by cohort
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Simulate hold time distribution
    // In reality, this would come from on-chain analysis of transfer events
    const cohorts = [
      { cohort: "< 1 day", days: 0.5, holders: 0, color: "#f87171" },
      { cohort: "1-7 days", days: 4, holders: 0, color: "#fb923c" },
      { cohort: "1-4 weeks", days: 17, holders: 0, color: "#fbbf24" },
      { cohort: "1-3 months", days: 60, holders: 0, color: "#a3e635" },
      { cohort: "3-6 months", days: 135, holders: 0, color: "#4ade80" },
      { cohort: "6+ months", days: 240, holders: 0, color: CHART_COLORS.success },
    ];

    // Simulate distribution based on volume patterns
    // Higher recent volume = more short-term holders
    const recentVolume = data.slice(-7).reduce((sum, d) => sum + d.volumeUsd, 0);
    const olderVolume = data.slice(0, 7).reduce((sum, d) => sum + d.volumeUsd, 0);
    const turnoverRatio = recentVolume > 0 ? olderVolume / recentVolume : 1;

    // Distribute 1000 simulated holders
    const totalHolders = 1000;
    cohorts[0].holders = Math.floor(totalHolders * (turnoverRatio < 1 ? 0.15 : 0.08)); // Short term
    cohorts[1].holders = Math.floor(totalHolders * (turnoverRatio < 1 ? 0.20 : 0.12));
    cohorts[2].holders = Math.floor(totalHolders * 0.18);
    cohorts[3].holders = Math.floor(totalHolders * 0.22);
    cohorts[4].holders = Math.floor(totalHolders * 0.15);
    cohorts[5].holders = totalHolders - cohorts.slice(0, 5).reduce((sum, c) => sum + c.holders, 0);

    return cohorts;
  }, [data]);

  // Calculate stats
  const totalHolders = chartData.reduce((sum, d) => sum + d.holders, 0);
  const weightedSum = chartData.reduce((sum, d) => sum + d.days * d.holders, 0);
  const avgHoldTime = totalHolders > 0 ? weightedSum / totalHolders : 0;

  // Calculate median (50th percentile)
  let cumulative = 0;
  let medianDays = 0;
  for (const cohort of chartData) {
    cumulative += cohort.holders;
    if (cumulative >= totalHolders / 2) {
      medianDays = cohort.days;
      break;
    }
  }

  // Calculate trend
  const longTermHolders = chartData.slice(-2).reduce((sum, c) => sum + c.holders, 0);
  const longTermPercent = totalHolders > 0 ? (longTermHolders / totalHolders) * 100 : 0;

  // Legend items with active state
  const legendItems: LegendItem[] = [
    {
      key: "holdTime",
      label: "Hold Duration",
      color: CHART_COLORS.primary,
      active: visibleSeries.holdTime,
    },
  ];

  // Export configuration
  const exportConfig = useMemo(
    () => ({
      filename: getChartFilename("hold-time", timeRange),
      title: "Average Hold Time",
    }),
    [timeRange]
  );

  return (
    <StandardChartCard
      title="Average Hold Time (Simulated)"
      description="Illustrative hold duration distribution - actual data requires on-chain transfer event analysis"
      legend={legendItems}
      onLegendToggle={handleLegendToggle}
      exportConfig={exportConfig}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No hold time data available"
      stats={
        <ChartStatGrid columns={3}>
          <ChartStatCard
            label="Avg Hold"
            value={`${avgHoldTime.toFixed(0)} days`}
          />
          <ChartStatCard
            label="Median Hold"
            value={`${medianDays.toFixed(0)} days`}
          />
          <ChartStatCard
            label="Long-term"
            value={`${longTermPercent.toFixed(0)}%`}
          />
        </ChartStatGrid>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGINS.default}>
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="cohort"
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke={AXIS_STYLE.stroke}
            fontSize={AXIS_STYLE.fontSize}
            fontFamily={AXIS_STYLE.fontFamily}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={40}
          />
          <Tooltip
            contentStyle={getTooltipContentStyle()}
            labelStyle={{ color: "#fafafa" }}
            formatter={(value) => [formatNumber(Number(value)), "Holders"]}
          />
          {visibleSeries.holdTime && (
            <Bar dataKey="holders" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </StandardChartCard>
  );
}
