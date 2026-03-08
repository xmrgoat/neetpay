import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/constants";

interface BadgeProps {
  status: PaymentStatus;
  className?: string;
}

const colorMap: Record<PaymentStatus, string> = {
  paid: "bg-emerald-500/10 text-emerald-500",
  pending: "bg-amber-500/10 text-amber-500",
  swap_pending: "bg-orange-500/10 text-orange-500",
  confirming: "bg-blue-500/10 text-blue-500",
  expired: "bg-neutral-500/10 text-neutral-500",
  failed: "bg-red-500/10 text-red-500",
  underpaid: "bg-orange-500/10 text-orange-500",
  refunded: "bg-purple-500/10 text-purple-500",
};

const dotColorMap: Record<PaymentStatus, string> = {
  paid: "bg-emerald-500",
  pending: "bg-amber-500",
  swap_pending: "bg-orange-500",
  confirming: "bg-blue-500",
  expired: "bg-neutral-500",
  failed: "bg-red-500",
  underpaid: "bg-orange-500",
  refunded: "bg-purple-500",
};

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorMap[status],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", dotColorMap[status])}
        aria-hidden
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default Badge;
