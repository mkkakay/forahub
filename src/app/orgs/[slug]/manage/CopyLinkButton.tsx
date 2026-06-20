"use client";

// Small client utility — copies the public org URL to the clipboard and
// flashes a brief "Copied" state. Used by the Settings tab.

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // No-op — clipboard API can be disabled in some embedded views.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#0f2a4a] hover:bg-[#1a3f6e] rounded-lg px-3 py-2 transition-colors"
    >
      {copied
        ? <><Check className="w-3.5 h-3.5" /> Copied</>
        : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
    </button>
  );
}
