import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/constants";
import { PaymentLinksContent } from "./payment-links-content";

export default async function PaymentLinksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const payments = await db.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      trackId: true,
      amount: true,
      currency: true,
      payCurrency: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  const existingLinks = payments.map((p) => ({
    trackId: p.trackId,
    url: `${SITE_URL}/pay/${p.trackId}`,
    amount: p.amount,
    currency: p.currency,
    payCurrency: p.payCurrency ?? "BTC",
    description: p.description,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));

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
      <PaymentLinksContent userId={session.user.id} initialLinks={existingLinks} />
    </div>
  );
}
