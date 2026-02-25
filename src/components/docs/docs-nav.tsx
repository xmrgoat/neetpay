"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const DOCS_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs" },
      { label: "Quick Start", href: "/docs/quick-start" },
      { label: "Authentication", href: "/docs/authentication" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { label: "Create Invoice", href: "/docs/api/create-invoice" },
      { label: "Payment Status", href: "/docs/api/payment-status" },
      { label: "Webhooks", href: "/docs/api/webhooks" },
      { label: "Currencies", href: "/docs/api/currencies" },
    ],
  },
  {
    title: "Guides",
    items: [
      { label: "White Label", href: "/docs/guides/white-label" },
      { label: "Subscriptions", href: "/docs/guides/subscriptions" },
      { label: "Error Handling", href: "/docs/guides/error-handling" },
    ],
  },
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0">
      <div className="sticky top-24 space-y-8">
        {DOCS_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-3">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                      pathname === item.href
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
