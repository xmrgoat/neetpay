"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { Copy, Check } from "lucide-react";

export function QuickStartCodeClient({ code }: { code: string }) {
  return <CodeBlock code={code} language="bash" filename="Terminal" />;
}

export function BaseUrlCopy({ baseUrl }: { baseUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground hover:bg-elevated transition-colors group"
      aria-label={copied ? "Copied" : "Copy base URL"}
    >
      <span>{baseUrl}</span>
      {copied ? (
        <Check size={12} className="text-success" />
      ) : (
        <Copy size={12} className="text-foreground-secondary group-hover:text-foreground transition-colors" />
      )}
    </button>
  );
}
