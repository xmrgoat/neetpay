"use client";

import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  copyable?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  copyable = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg overflow-hidden",
        className,
      )}
    >
      {filename && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs font-mono text-muted">{filename}</span>
          {copyable && (
            <button
              onClick={handleCopy}
              className="text-muted hover:text-foreground transition-colors duration-150"
              aria-label={copied ? "Copied" : "Copy code"}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
        </div>
      )}
      <div className="relative">
        {copyable && !filename && (
          <button
            onClick={handleCopy}
            className="absolute right-3 top-3 text-muted hover:text-foreground transition-colors duration-150 z-10"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </button>
        )}
        <pre className="overflow-x-auto p-4">
          <code
            className="text-sm font-mono text-foreground leading-relaxed"
            data-language={language}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default CodeBlock;
