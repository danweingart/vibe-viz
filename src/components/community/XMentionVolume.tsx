"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import {
  CHART_MARGINS,
  AXIS_STYLE,
  GRID_STYLE,
  TOOLTIP_STYLE,
} from "@/lib/chartConfig";
import type { WeeklyVolume } from "@/hooks/useXMentions";

const BAR_COLOR = "#1d9bf0"; // X/Twitter blue

interface XMentionVolumeProps {
  data: WeeklyVolume[] | undefined;
  isLoading: boolean;
}

export function XMentionVolume({ data, isLoading }: XMentionVolumeProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tweet Volume</CardTitle>
        </CardHeader>
        <div className="p-4">
          <div className="h-[280px] bg-gvc-border/30 rounded animate-shimmer" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tweet Volume</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-center h-[280px] text-gvc-text-muted text-sm">
          No mention data available
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Tweet Volume</CardTitle>
        <p className="text-xs text-gvc-text-muted mt-1">
          Weekly mentions of Good Vibes Club on X
        </p>
      </CardHeader>
      <div className="p-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={CHART_MARGINS.default}>
              <CartesianGrid
                strokeDasharray={GRID_STYLE.strokeDasharray}
                stroke={GRID_STYLE.stroke}
                vertical={GRID_STYLE.vertical}
              />
              <XAxis
                dataKey="week"
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
              />
              <YAxis
                stroke={AXIS_STYLE.stroke}
                fontSize={AXIS_STYLE.fontSize}
                fontFamily={AXIS_STYLE.fontFamily}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                allowDecimals={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  ...TOOLTIP_STYLE,
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                itemStyle={{ color: BAR_COLOR }}
                formatter={(value: number | undefined) => [`${value ?? 0} tweets`, "Mentions"]}
              />
              <Bar
                dataKey="count"
                fill={BAR_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
