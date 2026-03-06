import { FileText } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <FileText className="h-10 w-10 text-muted" />
      <h1 className="font-heading text-xl font-semibold">Invoices</h1>
      <p className="max-w-sm text-sm text-foreground-secondary">
        Create and manage crypto invoices for your clients. Coming soon.
      </p>
    </div>
  );
}
