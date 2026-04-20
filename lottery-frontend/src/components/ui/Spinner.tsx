interface SpinnerProps {
  size?: "xs" | "sm" | "md";
  className?: string;
}

const sizes = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
};

export default function Spinner({ size = "sm", className = "border-laccent/30 border-t-laccent" }: SpinnerProps) {
  return (
    <span className={`inline-block animate-spin rounded-full ${sizes[size]} ${className}`} />
  );
}
