"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed this session
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      sessionStorage.getItem("pwa-prompt-dismissed")
    ) return;

    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the banner after 30 seconds
      setTimeout(() => setVisible(true), 30_000);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setVisible(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[300] sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-[#0f2a4a] border border-[#4ea8de]/30 rounded-2xl shadow-2xl p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#0f2a4a] border border-[#4ea8de]/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-96x96.png" alt="ForaHub" width={48} height={48} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-snug">
              Add ForaHub to your home screen
            </p>
            <p className="text-blue-300 text-xs mt-1 leading-relaxed">
              Quick access to global development events, even offline.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Add to Home Screen
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-blue-400 hover:text-white transition-colors shrink-0 -mt-0.5"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
