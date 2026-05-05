"use client";

import Link from "next/link";
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function Footer() {
  const { lang, setLang } = useLanguage();

  return (
    <footer className="bg-[#0f2a4a] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mb-4">ForaHub</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/events/create" className="hover:text-white transition-colors">Submit Event</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/data-sources" className="hover:text-white transition-colors">Data Sources</Link></li>
              <li><Link href="/funding" className="hover:text-white transition-colors">Travel Grants</Link></li>
              <li><Link href="/assistant" className="hover:text-white transition-colors">AI Assistant</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/privacy#cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mb-4">Language</h3>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={14} className="text-blue-300" />
              <span className="text-sm text-gray-300">
                {LANGUAGES[lang].native}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    lang === l
                      ? "bg-[#4ea8de] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {LANGUAGES[l].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            {t(lang, "footer.copyright")}
          </p>
          <p className="text-sm text-gray-400">
            {t(lang, "footer.built")}
          </p>
        </div>
      </div>
    </footer>
  );
}
