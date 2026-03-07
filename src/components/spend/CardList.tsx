"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { OrderForm } from "./OrderForm";

interface PrepaidCard {
  provider: string;
  currency_code: string;
  name?: string;
  price_range?: string;
}

export function CardList() {
  const [cards, setCards] = useState<PrepaidCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [selected, setSelected] = useState<PrepaidCard | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/v1/cards?currency=${currency}`,
        {
          headers: {
            "X-API-Key": localStorage.getItem("api_key") || "",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  if (selected) {
    return (
      <OrderForm
        type="prepaid"
        provider={selected.provider}
        currencyCode={selected.currency_code}
        name={selected.name || selected.provider}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Currency filter */}
      <div className="flex gap-2">
        {["USD", "EUR", "GBP"].map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              currency === c
                ? "bg-primary text-white"
                : "bg-white/[0.06] text-foreground-secondary hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <CreditCard className="h-10 w-10 text-muted" />
          <p className="text-sm text-foreground-secondary">
            No prepaid cards available for {currency}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <button
              key={`${card.provider}-${card.currency_code}-${i}`}
              onClick={() => setSelected(card)}
              className="flex flex-col gap-2 rounded-xl border border-border bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {card.name || card.provider}
                  </p>
                  <p className="text-xs text-foreground-secondary">
                    {card.currency_code}
                  </p>
                </div>
              </div>
              {card.price_range && (
                <p className="text-xs text-muted">{card.price_range}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
