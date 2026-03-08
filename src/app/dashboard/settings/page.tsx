"use client";

import { useSearchParams } from "next/navigation";
import { SettingsTabs } from "@/components/dashboard/settings/settings-tabs";
import { ProfileSection } from "@/components/dashboard/settings/profile-section";
import { ApiKeysSection } from "@/components/dashboard/settings/api-keys-section";
import { WebhookSection } from "@/components/dashboard/settings/webhook-section";
import { SubscriptionSection } from "@/components/dashboard/settings/subscription-section";
import { SettlementSection } from "@/components/dashboard/settings/settlement-section";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "general";

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
          <ProfileSection name={null} email="" />
          <WebhookSection
            currentUrl={null}
            webhookSecret={null}
            recentLogs={[]}
          />
        </div>
      )}

      {activeTab === "payouts" && (
        <div className="space-y-6">
          <SettlementSection
            xmrSettlementAddress={null}
            autoForwardEnabled={true}
            platformFeePercent={0.4}
            minForwardAmount={0.001}
          />
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <ApiKeysSection keys={[]} />
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          <SubscriptionSection
            plan="free"
            subscription={null}
          />
        </div>
      )}
    </div>
  );
}
