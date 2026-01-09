import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: 24,
  md: 32,
  lg: 40,
};

export function Logo({ size = "md", className }: LogoProps) {
  const dimension = sizes[size];

  return (
    <div
      className={`rounded-full bg-brand flex items-center justify-center ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src="/images/shaka.png"
        alt="Good Vibes Club"
        width={dimension * 0.7}
        height={dimension * 0.7}
        className="invert"
      />
    </div>
  );
}

// Fallback if image not found
export function LogoFallback({ size = "md", className }: LogoProps) {
  const dimension = sizes[size];

  return (
    <div
      className={`rounded-full bg-brand flex items-center justify-center text-background font-bold ${className}`}
      style={{ width: dimension, height: dimension, fontSize: dimension * 0.5 }}
    >
      🤙
    </div>
  );
}
