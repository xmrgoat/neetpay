"use client";

import { useState } from "react";
import { CreditCard, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardList } from "@/components/spend/CardList";
import { GiftCardList } from "@/components/spend/GiftCardList";

const TABS = [
  { id: "prepaid", label: "Prepaid Cards", icon: CreditCard },
  { id: "giftcards", label: "Gift Cards", icon: Gift },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SpendPage() {
  const [activeTab, setActiveTab] = useState<TabId>("prepaid");

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Spend</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Buy prepaid cards and gift cards with crypto. No KYC required.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white/[0.08] text-foreground"
                : "text-foreground-secondary hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "prepaid" ? <CardList /> : <GiftCardList />}
    </div>
  );
}
