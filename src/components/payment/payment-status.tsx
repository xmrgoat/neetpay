import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { PaymentStatus as PaymentStatusType } from "@/lib/constants";

const STATUS_ICONS: Record<string, React.ElementType> = {
  new: Clock,
  waiting: Clock,
  confirming: Loader2,
  confirmed: Loader2,
  sending: Loader2,
  paid: CheckCircle2,
  failed: XCircle,
  expired: AlertTriangle,
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  waiting: "Waiting for payment",
  confirming: "Confirming",
  confirmed: "Confirmed",
  sending: "Sending",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
};

interface PaymentStatusProps {
  status: PaymentStatusType;
}

export function PaymentStatus({ status }: PaymentStatusProps) {
  const Icon = STATUS_ICONS[status] ?? Clock;
  const label = STATUS_LABELS[status] ?? status;
  const isAnimated = ["confirming", "confirmed", "sending"].includes(status);

  return (
    <div className="flex items-center gap-3">
      <Icon
        size={18}
        className={isAnimated ? "animate-spin text-primary" : "text-foreground-secondary"}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <Badge status={status} />
      </div>
    </div>
  );
}
