"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import {
  Globe, Sun, Moon, Contrast, Bell, ChevronDown, X, Menu,
  Sparkles, BookmarkCheck, LogOut, User, LayoutDashboard
} from "lucide-react";

export default function Navbar() {
  const { userId, userEmail, tier, isOnTrial } = useSubscription();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = !!userId;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function ThemeIcon() {
    if (theme === "dark") return <Moon size={16} />;
    if (theme === "high-contrast") return <Contrast size={16} />;
    return <Sun size={16} />;
  }

  function cycleTheme() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("high-contrast");
    else setTheme("light");
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "U";

  const navLinks = [
    { href: "/events", label: t(lang, "nav.discover") },
    { href: "/funding", label: t(lang, "nav.funding") },
    { href: "/saved", label: t(lang, "nav.saved") },
    { href: "/pricing", label: t(lang, "nav.pricing") },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled ? "bg-[#0f2a4a]/95 backdrop-blur-md shadow-lg" : "bg-[#0f2a4a]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true" className="shrink-0">
                <circle cx="13" cy="13" r="11" stroke="#4ea8de" strokeWidth="1.5" />
                <ellipse cx="13" cy="13" rx="5" ry="11" stroke="#4ea8de" strokeWidth="1.5" />
                <line x1="2" y1="13" x2="24" y2="13" stroke="#4ea8de" strokeWidth="1.5" />
                <path d="M13 2c-2.5 3.5-3 6.5-3 11s.5 7.5 3 11" stroke="#4ea8de" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-white text-xl font-extrabold tracking-tight">
                Fora<span className="text-[#4ea8de]">Hub</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                    pathname.startsWith(href)
                      ? "text-white bg-white/10"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={cycleTheme}
              className="hidden sm:flex p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              title={`Theme: ${theme}`}
            >
              <ThemeIcon />
            </button>

            <div ref={langRef} className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-sm"
              >
                <Globe size={16} />
                <span className="hidden lg:inline text-xs">{LANGUAGES[lang].label}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-[#0f2a4a] border border-white/10 rounded-xl shadow-xl py-1 z-50">
                  {(Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setLangOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${
                        lang === l ? "text-[#4ea8de]" : "text-gray-300"
                      }`}
                    >
                      <span>{LANGUAGES[l].native}</span>
                      <span className="text-xs text-gray-500">{LANGUAGES[l].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/events/create"
              className="hidden md:flex text-sm font-semibold px-3 py-1.5 rounded-md bg-[#4ea8de]/20 text-[#4ea8de] border border-[#4ea8de]/30 hover:bg-[#4ea8de]/30 transition-colors"
            >
              + {t(lang, "nav.submit")}
            </Link>

            {isLoggedIn ? (
              <>
                <Link href="/notifications" className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  <Bell size={18} />
                </Link>
                <div ref={userRef} className="relative">
                  <button
                    onClick={() => setUserOpen(!userOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#4ea8de] flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                    {(tier === "pro" || tier === "founding") && (
                      <span className="hidden sm:inline text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                        {tier === "founding" ? "★" : "Pro"}
                      </span>
                    )}
                    <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                  </button>
                  {userOpen && (
                    <div className="absolute right-0 mt-1 w-56 bg-[#0f2a4a] border border-white/10 rounded-xl shadow-xl py-1 z-50">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm text-white font-medium truncate">{userEmail}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">{isOnTrial ? "Pro Trial" : tier}</p>
                      </div>
                      <Link href="/dashboard" onClick={() => setUserOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                        <LayoutDashboard size={15} /> {t(lang, "nav.dashboard")}
                      </Link>
                      <Link href="/saved" onClick={() => setUserOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                        <BookmarkCheck size={15} /> {t(lang, "nav.saved")}
                      </Link>
                      <Link href="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                        <User size={15} /> Profile
                      </Link>
                      <div className="border-t border-white/10 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                        >
                          <LogOut size={15} /> {t(lang, "nav.signout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="hidden sm:flex text-sm font-medium px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  {t(lang, "nav.signin")}
                </Link>
                <Link href="/auth/signup" className="text-sm font-semibold px-4 py-2 rounded-md bg-[#4ea8de] hover:bg-[#3a95cc] text-white transition-colors">
                  {t(lang, "nav.getstarted")}
                </Link>
              </>
            )}

            <button
              className="md:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0f2a4a] border-t border-white/10 px-4 py-4 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="block px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md">
              {label}
            </Link>
          ))}
          <Link href="/events/create" className="block px-3 py-2.5 text-sm font-medium text-[#4ea8de] hover:bg-white/5 rounded-md">
            + Submit Event
          </Link>
          <Link href="/assistant" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md">
            <Sparkles size={15} /> AI Assistant
          </Link>
          <div className="pt-2 border-t border-white/10">
            <button onClick={cycleTheme} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-2">
              <ThemeIcon /> {theme} mode
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3 pt-1">
            {(Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  lang === l ? "bg-[#4ea8de] text-white" : "text-gray-400 border border-white/20 hover:text-white"
                }`}
              >
                {LANGUAGES[l].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
