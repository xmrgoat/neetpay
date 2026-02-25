import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PaymentLinksContent } from "./payment-links-content";

export default async function PaymentLinksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Payment Links
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Create and share payment links with your customers
        </p>
      </div>
      <PaymentLinksContent userId={session.user.id} />
    </div>
  );
}
