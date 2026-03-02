import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsTabs } from "@/components/dashboard/settings/settings-tabs";
import { ProfileSection } from "@/components/dashboard/settings/profile-section";
import { ApiKeysSection } from "@/components/dashboard/settings/api-keys-section";
import { WebhookSection } from "@/components/dashboard/settings/webhook-section";
import { SubscriptionSection } from "@/components/dashboard/settings/subscription-section";
import { SettlementSection } from "@/components/dashboard/settings/settlement-section";

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const activeTab = params.tab || "general";

  const [user, apiKeys, subscription, webhookLogs] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        plan: true,
        webhookUrl: true,
        webhookSecret: true,
        xmrSettlementAddress: true,
        autoForwardEnabled: true,
        platformFeePercent: true,
        minForwardAmount: true,
      },
    }),
    db.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.findFirst({
      where: { userId: session.user.id, status: "active" },
      orderBy: { createdAt: "desc" },
    }),
    db.webhookLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!user) redirect("/login");

  const maskedKeys = apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    maskedKey: `sk_live_${"*".repeat(24)}${k.key.slice(-4)}`,
    lastUsed: k.lastUsed?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  const serializedLogs = webhookLogs.map((log) => ({
    id: log.id,
    url: log.url,
    status: log.status,
    success: log.success,
    duration: log.duration,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <div className="h-full overflow-y-auto no-scrollbar space-y-6 pb-4">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Settings
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Manage your account preferences
        </p>
      </div>

      <SettingsTabs activeTab={activeTab} />

      {activeTab === "general" && (
        <div className="space-y-6">
          <ProfileSection name={user.name} email={user.email} />
          <WebhookSection
            currentUrl={user.webhookUrl}
            webhookSecret={user.webhookSecret}
            recentLogs={serializedLogs}
          />
        </div>
      )}

      {activeTab === "payouts" && (
        <div className="space-y-6">
          <SettlementSection
            xmrSettlementAddress={user.xmrSettlementAddress ?? null}
            autoForwardEnabled={user.autoForwardEnabled ?? true}
            platformFeePercent={user.platformFeePercent ?? 0.4}
            minForwardAmount={user.minForwardAmount ?? 0.001}
          />
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <ApiKeysSection keys={maskedKeys} />
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          <SubscriptionSection
            plan={user.plan}
            subscription={
              subscription
                ? {
                    status: subscription.status,
                    endDate: subscription.endDate?.toISOString() ?? null,
                  }
                : null
            }
          />
        </div>
      )}
    </div>
  );
}
