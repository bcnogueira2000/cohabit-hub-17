import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export const EmptyState = ({ icon: Icon, title, description, action, className, size = "md" }: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "py-6 px-3" : "py-10 px-4",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mb-3",
            size === "sm" ? "h-9 w-9" : "h-12 w-12",
          )}
        >
          <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      )}
      <div className={cn("font-medium text-foreground", size === "sm" ? "text-sm" : "text-base")}>{title}</div>
      {description && (
        <p className={cn("text-muted-foreground mt-1 max-w-sm", size === "sm" ? "text-xs" : "text-sm")}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
