"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export default function CookieConsent() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("forahub-cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("forahub-cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("forahub-cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-[#0f2a4a] border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-300 flex-1">
          {t(lang, "cookie.message")}{" "}
          <Link href="/privacy#cookies" className="text-[#4ea8de] hover:underline">
            Learn more
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="text-sm px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors"
          >
            {t(lang, "cookie.decline")}
          </button>
          <button
            onClick={accept}
            className="text-sm px-4 py-2 rounded-lg bg-[#4ea8de] text-white font-semibold hover:bg-[#3a95cc] transition-colors"
          >
            {t(lang, "cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
