import React from "react";
import { cn } from "@/utils/cn";

export interface GradientTextProps
  extends React.HTMLAttributes<HTMLHeadingElement | HTMLSpanElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div";
}

export function GradientText({
  as: Component = "h2",
  className,
  children,
  ...props
}: GradientTextProps) {
  return (
    <Component
      className={cn(
        "bg-linear-to-r from-white to-light-blue bg-clip-text text-transparent",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
