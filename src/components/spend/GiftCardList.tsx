"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { OrderForm } from "./OrderForm";

interface GiftCard {
  product_id: string;
  name?: string;
  country?: string;
  price_range?: string;
  image?: string;
}

export function GiftCardList() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("US");
  const [selected, setSelected] = useState<GiftCard | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/v1/giftcards?country=${country}`,
        {
          headers: {
            "X-API-Key": localStorage.getItem("api_key") || "",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setCards(data.gift_cards || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  if (selected) {
    return (
      <OrderForm
        type="giftcard"
        productId={selected.product_id}
        name={selected.name || "Gift Card"}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Country filter */}
      <div className="flex gap-2">
        {["US", "FR", "DE", "GB", "CA"].map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              country === c
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
          <Gift className="h-10 w-10 text-muted" />
          <p className="text-sm text-foreground-secondary">
            No gift cards available for {country}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.product_id}
              onClick={() => setSelected(card)}
              className="flex flex-col gap-2 rounded-xl border border-border bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-3">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.name || "Gift Card"}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {card.name || "Gift Card"}
                  </p>
                  {card.country && (
                    <p className="text-xs text-foreground-secondary">
                      {card.country}
                    </p>
                  )}
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
