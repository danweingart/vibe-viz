/**
 * Chart labeling utilities from V2
 */

/**
 * Get target number of labels for a time range
 */
function getTargetLabelCount(timeRange: number): number {
  switch (timeRange) {
    case 7:
      return 7; // One per day
    case 30:
      return 5; // Roughly weekly
    case 90:
      return 6; // Bi-weekly
    default:
      return 8; // Spread across entire range
  }
}

/**
 * Determine if label should be shown based on index and data length
 * @param index - Current data point index
 * @param dataLength - Total data points
 * @param timeRange - Time range (7, 30, 90)
 * @returns Whether to show label
 */
export function shouldShowLabel(index: number, dataLength: number, timeRange: number): boolean {
  if (dataLength === 0) return false;

  // Always show first and last
  if (index === 0 || index === dataLength - 1) return true;

  const targetLabels = getTargetLabelCount(timeRange);
  const step = Math.max(1, Math.floor(dataLength / targetLabels));

  return index % step === 0;
}

/**
 * Custom Label Component for Recharts
 * Renders a label with opaque background for guaranteed readability
 */
interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  index?: number;
  dataLength?: number;
  timeRange?: number;
  formatter?: (value: number) => string;
  color?: string;
  payload?: any; // The data point object (only available for Bar charts)
  tickDates?: string[]; // Array of tick dates to show labels on
  date?: string; // Explicit date for Area/Line charts
}

export function CustomLabel({
  x = 0,
  y = 0,
  width,
  height,
  value = 0,
  index = 0,
  dataLength = 0,
  timeRange = 30,
  formatter = (v) => v.toFixed(2),
  color = "#ffe048",
  payload,
  tickDates,
  date,
}: CustomLabelProps) {
  // Never show labels for zero, null, or undefined values
  if (value === null || value === undefined || value === 0) {
    return null;
  }

  // If tickDates is provided, only show labels on tick dates
  if (tickDates) {
    // Get the date from either explicit prop or payload
    const pointDate = date || payload?.date;

    if (!pointDate || !tickDates.includes(pointDate)) {
      return null;
    }
  } else {
    // Fallback to old logic if tickDates not provided
    if (!shouldShowLabel(index, dataLength, timeRange)) {
      return null;
    }
  }

  const formattedValue = formatter(value);
  // Estimate text width
  const textWidth = formattedValue.length * 6.5;
  const padding = 6;
  const rectWidth = textWidth + padding * 2;
  const rectHeight = 20;

  // For bar charts, center the label over the bar
  // Recharts provides width for bar charts, so we offset by half the bar width
  const centerX = width !== undefined ? x + width / 2 : x;

  return (
    <g>
      {/* Background rectangle - fully opaque */}
      <rect
        x={centerX - rectWidth / 2}
        y={y - 26}
        width={rectWidth}
        height={rectHeight}
        fill="#050505"
        stroke={`${color}4D`}
        strokeWidth="1"
        rx="4"
      />
      {/* Label text - matches the series color */}
      <text
        x={centerX}
        y={y - 12}
        fill={color}
        fontSize="11"
        fontFamily="Mundial, sans-serif"
        fontWeight="600"
        textAnchor="middle"
      >
        {formattedValue}
      </text>
    </g>
  );
}
