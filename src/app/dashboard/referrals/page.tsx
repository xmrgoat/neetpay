import { Users } from "lucide-react";

export default function ReferralsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Users className="h-10 w-10 text-muted" />
      <h1 className="font-heading text-xl font-semibold">Referrals</h1>
      <p className="max-w-sm text-sm text-foreground-secondary">
        Earn commissions by referring merchants to neetpay. Coming soon.
      </p>
    </div>
  );
}
