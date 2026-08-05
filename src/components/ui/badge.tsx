import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "accent" | "outline";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-foreground",
        variant === "accent" && "bg-accent/15 text-accent",
        variant === "outline" && "border border-border text-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
