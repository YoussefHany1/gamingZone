import React from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "social-google";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-linear-to-r from-secondary-blue to-light-blue shadow-lg shadow-light-blue/20 hover:opacity-90",
      secondary:
        "bg-white/10 hover:bg-white/20 text-white border border-white/10",
      danger:
        "bg-linear-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/20 hover:opacity-90",
      ghost: "hover:bg-white/10 text-white",
      "social-google":
        "bg-linear-to-r from-[#10574b] via-[#e92d18] to-[#c38d0c] hover:opacity-90",
    };

    const sizes = {
      sm: "py-2 px-4 text-sm rounded-xl",
      md: "py-3.5 px-6 rounded-xl",
      lg: "py-4 px-8 text-lg rounded-2xl",
      icon: "p-2 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
