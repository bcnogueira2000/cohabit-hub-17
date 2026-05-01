import { cn } from "@/lib/utils";
import { RequestPriority, RequestStatus } from "@/lib/types";
import { priorityLabels, statusLabels } from "@/lib/labels";

const statusStyles: Record<RequestStatus, string> = {
  open: "bg-info/15 text-info border-info/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  waiting_resident: "bg-accent text-accent-foreground border-accent",
  waiting_supplier: "bg-secondary text-secondary-foreground border-secondary",
  resolved: "bg-success/15 text-success border-success/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const priorityStyles: Record<RequestPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/15 text-info",
  high: "bg-warning/20 text-warning",
  urgent: "bg-destructive/15 text-destructive",
};

export const StatusBadge = ({ status, className }: { status: RequestStatus; className?: string }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", statusStyles[status], className)}>
    {statusLabels[status]}
  </span>
);

export const PriorityBadge = ({ priority, className }: { priority: RequestPriority; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", priorityStyles[priority], className)}>
    {priority === "urgent" && <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />}
    {priorityLabels[priority]}
  </span>
);
