"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/context/SubscriptionContext";

export default function Navbar() {
  const { userId, userEmail, tier, isOnTrial } = useSubscription();
  const router = useRouter();
  const isLoggedIn = !!userId;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-[#0f2a4a] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-white text-xl font-bold tracking-tight">
              Fora<span className="text-[#4ea8de]">Hub</span>
            </Link>
            <Link
              href="/pricing"
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors hidden sm:block"
            >
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Tier badge */}
                {tier === "founding" ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    ★ Founding
                  </span>
                ) : tier === "pro" ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-400/20 text-green-300 border border-green-400/30">
                    ✓ Pro
                  </span>
                ) : isOnTrial ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30">
                    Trial
                  </span>
                ) : (
                  <Link
                    href="/pricing"
                    className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-full text-[#4ea8de] border border-[#4ea8de]/40 hover:bg-[#4ea8de]/10 transition-colors"
                  >
                    Upgrade to Pro
                  </Link>
                )}

                <span className="text-gray-300 text-sm hidden md:block truncate max-w-[160px]">
                  {userEmail}
                </span>
                <Link
                  href="/saved"
                  className="text-gray-300 hover:text-white text-sm font-medium px-3 py-2 rounded-md transition-colors"
                >
                  Saved
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white text-sm font-medium px-3 py-2 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
