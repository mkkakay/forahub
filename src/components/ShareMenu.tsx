"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Check } from "lucide-react";

interface ShareMenuProps {
  eventId: string;
  eventTitle: string;
}

export default function ShareMenu({ eventId, eventTitle }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function getUrl(): string {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/events/${eventId}`;
    }
    return `/events/${eventId}`;
  }

  async function handleCopy() {
    const url = getUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1500);
  }

  function handleWhatsApp() {
    const url = getUrl();
    const text = encodeURIComponent(`${eventTitle}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function handleEmail() {
    const url = getUrl();
    const subject = encodeURIComponent(eventTitle);
    const body = encodeURIComponent(`Check out this event:\n\n${eventTitle}\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setOpen(false);
  }

  function handleTrigger(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(prev => !prev);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleTrigger}
        aria-label="Share event"
        className="p-1.5 rounded-md text-gray-400 hover:text-[#4ea8de] transition-colors"
      >
        <Share2 size={16} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-500" />
                Copied!
              </>
            ) : (
              "Copy link"
            )}
          </button>
          <button
            onClick={handleWhatsApp}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            WhatsApp
          </button>
          <button
            onClick={handleEmail}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Email
          </button>
        </div>
      )}
    </div>
  );
}
