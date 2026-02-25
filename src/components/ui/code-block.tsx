"use client";

import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-[#0a0a0a] overflow-hidden",
        className
      )}
    >
      {filename && (
        <div className="flex items-center justify-between border-b border-[#262626] px-4 py-2.5">
          <span className="text-xs font-mono text-[#a3a3a3]">{filename}</span>
          <button
            onClick={handleCopy}
            className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}
      {!filename && (
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors z-10"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
      <div className="relative">
        <pre className="overflow-x-auto p-4">
          <code
            className="text-sm font-mono text-[#f5f5f5] leading-relaxed"
            data-language={language}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
