import { cn } from "@/utils/cn";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-4",
    lg: "w-16 h-16 border-4",
  };

  return (
    <div className={cn("flex justify-center py-20 w-full", className)}>
      <div className={cn("border-light-blue border-t-transparent rounded-full animate-spin", sizeClasses[size])}></div>
    </div>
  );
}
