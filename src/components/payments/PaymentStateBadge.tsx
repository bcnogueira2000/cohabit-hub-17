import { cn } from "@/lib/utils";
import { paymentStateLabels, type PaymentState } from "@/hooks/usePayments";

const styles: Record<PaymentState, string> = {
  paid: "bg-success/15 text-success border-success/30",
  partial: "bg-warning/15 text-warning border-warning/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  due: "bg-info/15 text-info border-info/30",
};

export const PaymentStateBadge = ({
  state,
  className,
}: {
  state: PaymentState;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      styles[state],
      className
    )}
  >
    {paymentStateLabels[state]}
  </span>
);
