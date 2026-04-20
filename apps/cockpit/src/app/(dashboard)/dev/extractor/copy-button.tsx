"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
      aria-label="Kopieer naar klembord"
    >
      {copied ? (
        <>
          <Check className="size-3 text-green-600" />
          Gekopieerd
        </>
      ) : (
        <>
          <Copy className="size-3" />
          Kopieer
        </>
      )}
    </button>
  );
}
