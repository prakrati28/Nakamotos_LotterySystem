interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

const sizeMap = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-7 w-7 border-[3px]",
};

export default function Spinner({
  size = "md",
  color = "border-accent/40 border-t-accent",
}: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full ${sizeMap[size]} ${color}`}
    />
  );
}
