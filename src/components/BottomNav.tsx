"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bookmark, Sparkles, User } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/events", icon: Search, label: "Discover" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
  { href: "/assistant", icon: Sparkles, label: "AI" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { userId } = useSubscription();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0f2a4a] border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const actualHref = href === "/profile" && !userId ? "/auth/signin" : href;
          return (
            <Link
              key={href}
              href={actualHref}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[48px] ${
                isActive ? "text-[#4ea8de]" : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
