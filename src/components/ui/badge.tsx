import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/constants";

const statusStyles: Record<PaymentStatus, string> = {
  new: "bg-foreground-secondary/10 text-foreground-secondary",
  waiting: "bg-warning/15 text-warning",
  paying: "bg-primary/15 text-primary-text",
  paid: "bg-success/15 text-success",
  expired: "bg-error/15 text-error",
  underpaid: "bg-warning/15 text-warning",
  refunded: "bg-foreground-secondary/10 text-foreground-secondary",
};

interface BadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium font-mono uppercase tracking-wider",
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
