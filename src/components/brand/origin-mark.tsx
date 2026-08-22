import { cn } from "@/lib/utils";

type OriginMarkProps = {
  className?: string;
  /** lighter text for dark/hero backgrounds */
  onDark?: boolean;
  size?: "sm" | "md";
};

/** Brand identity: Made in India · Born in Bhopal */
export function OriginMark({ className, onDark, size = "sm" }: OriginMarkProps) {
  return (
    <p
      className={cn(
        "uppercase tracking-[0.28em]",
        size === "sm" ? "text-[10px]" : "text-xs sm:text-sm",
        onDark ? "text-white/70" : "text-muted-foreground",
        className
      )}
    >
      Made in India
      <span className={cn("mx-2", onDark ? "text-white/40" : "text-border")}>·</span>
      Born in Bhopal
    </p>
  );
}
