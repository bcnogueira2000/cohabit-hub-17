import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/hooks/useContracts";

export const contractStatusLabels: Record<ContractStatus, string> = {
  reserved: "Reservado",
  active: "Ativo",
  terminated: "Terminado",
  cancelled: "Cancelado",
};

const styles: Record<ContractStatus, string> = {
  reserved: "bg-info/15 text-info border-info/30",
  active: "bg-success/15 text-success border-success/30",
  terminated: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export const ContractStatusBadge = ({
  status,
  className,
}: {
  status: ContractStatus;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      styles[status],
      className
    )}
  >
    {contractStatusLabels[status]}
  </span>
);
