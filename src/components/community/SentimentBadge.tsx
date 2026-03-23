"use client";

interface SentimentBadgeProps {
  diamondHandsPercent: number;
  newCollectors30d: number;
  netAccumulationRate: number;
}

function computeSentimentScore({
  diamondHandsPercent,
  newCollectors30d,
  netAccumulationRate,
}: SentimentBadgeProps): {
  score: number;
  label: string;
  color: string;
  bgColor: string;
} {
  // Weighted composite score (0-100)
  // Diamond hands: 40% weight (higher = better)
  // New collectors: 30% weight (more = better, capped at 20)
  // Net accumulation rate: 30% weight (positive = better)

  const dhScore = Math.min(diamondHandsPercent, 100);
  const ncScore = Math.min((newCollectors30d / 20) * 100, 100);
  const naScore = Math.min(Math.max(netAccumulationRate + 50, 0), 100); // normalize from -50..+50 to 0..100

  const score = Math.round(
    dhScore * 0.4 + ncScore * 0.3 + naScore * 0.3
  );

  if (score >= 75) {
    return {
      score,
      label: "Strong",
      color: "text-gvc-green",
      bgColor: "bg-gvc-green/10 border-gvc-green/30",
    };
  } else if (score >= 50) {
    return {
      score,
      label: "Healthy",
      color: "text-brand",
      bgColor: "bg-brand/10 border-brand/30",
    };
  } else if (score >= 25) {
    return {
      score,
      label: "Cautious",
      color: "text-orange-400",
      bgColor: "bg-orange-400/10 border-orange-400/30",
    };
  } else {
    return {
      score,
      label: "Weak",
      color: "text-gvc-red",
      bgColor: "bg-gvc-red/10 border-gvc-red/30",
    };
  }
}

export function SentimentBadge(props: SentimentBadgeProps) {
  const { score, label, color, bgColor } = computeSentimentScore(props);

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border ${bgColor}`}
    >
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className="stroke-gvc-border"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className={color.replace("text-", "stroke-")}
            strokeWidth="3"
            strokeDasharray={`${(score / 100) * 94.2} 94.2`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${color}`}
        >
          {score}
        </span>
      </div>
      <div>
        <div className={`text-sm font-bold ${color}`}>{label}</div>
        <div className="text-[10px] text-gvc-text-muted uppercase tracking-wider">
          Sentiment
        </div>
      </div>
    </div>
  );
}
