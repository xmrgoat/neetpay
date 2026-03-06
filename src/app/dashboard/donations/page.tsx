import { Heart } from "lucide-react";

export default function DonationsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Heart className="h-10 w-10 text-muted" />
      <h1 className="font-heading text-xl font-semibold">Donations</h1>
      <p className="max-w-sm text-sm text-foreground-secondary">
        Accept crypto donations with customizable widgets and pages. Coming soon.
      </p>
    </div>
  );
}
