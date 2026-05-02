"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/context/SubscriptionContext";
import { Check } from "lucide-react";

const FOUNDING_LIMIT = 100;

function Checkmark({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <Check size={15} className="text-[#4ea8de] shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}

export default function PricingClient({ foundingCount }: { foundingCount: number }) {
  const { userId, userEmail, tier, isOnTrial } = useSubscription();
  const router = useRouter();
  const [loading, setLoading] = useState<"pro" | "founding" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spotsLeft = Math.max(0, FOUNDING_LIMIT - foundingCount);
  const foundingFull = spotsLeft === 0;

  async function startCheckout(plan: "pro" | "founding") {
    if (!userId || !userEmail) {
      router.push("/auth/signup");
      return;
    }
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId, userEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not connect to payment provider. Please try again.");
      setLoading(null);
    }
  }

  const isProOrFounding = tier === "pro" || tier === "founding";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-[#0f2a4a] mb-4">Simple, honest pricing</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Start free. Upgrade when you need more reach.
        </p>
        {isOnTrial && (
          <div className="inline-flex items-center gap-2 mt-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-2 rounded-full">
            <span>🎉</span>
            Your 7-day Pro trial is active — you have full access right now.
          </div>
        )}
      </div>

      {error && (
        <div className="max-w-sm mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#0f2a4a] mb-1">Free</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-[#0f2a4a]">$0</span>
              <span className="text-gray-400 text-sm">forever</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">Events in the next 30 days, always free.</p>
          </div>
          <ul className="flex flex-col gap-3 mb-8 text-gray-600">
            <Checkmark text="Browse events in the next 30 days" />
            <Checkmark text="Full search and filters" />
            <Checkmark text="Event detail pages" />
            <Checkmark text="Share events" />
          </ul>
          <div className="text-sm text-center text-gray-400 py-2.5 border border-gray-200 rounded-lg font-medium">
            Current plan
          </div>
        </div>

        {/* Pro Annual — highlighted */}
        <div className="bg-[#0f2a4a] rounded-2xl shadow-xl p-8 relative ring-2 ring-[#4ea8de]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#4ea8de] text-white text-xs font-bold px-4 py-1 rounded-full">
              MOST POPULAR
            </span>
          </div>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">Pro Annual</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">$9.99</span>
              <span className="text-blue-300 text-sm">/year</span>
            </div>
            <p className="text-blue-200 text-sm mt-2">Less than $1/month. Cancel anytime.</p>
          </div>
          <ul className="flex flex-col gap-3 mb-8 text-blue-100">
            <li className="flex items-start gap-2.5 text-sm">
              <Check size={15} className="text-[#4ea8de] shrink-0 mt-0.5" />
              <span>Full 24-month event calendar</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check size={15} className="text-[#4ea8de] shrink-0 mt-0.5" />
              <span>Unlimited saved events &amp; collections</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check size={15} className="text-[#4ea8de] shrink-0 mt-0.5" />
              <span>Calendar export (Google, Outlook, Apple)</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check size={15} className="text-[#4ea8de] shrink-0 mt-0.5" />
              <span>Deadline reminders</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check size={15} className="text-[#4ea8de] shrink-0 mt-0.5" />
              <span>Weekly digest email</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check size={15} className="text-[#4ea8de] shrink-0 mt-0.5" />
              <span>Unlimited alerts</span>
            </li>
          </ul>
          {isProOrFounding ? (
            <div className="text-sm text-center text-[#4ea8de] py-2.5 border border-[#4ea8de]/40 rounded-lg font-semibold">
              ✓ Active on your account
            </div>
          ) : (
            <button
              onClick={() => startCheckout("pro")}
              disabled={loading !== null}
              className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-colors text-sm"
            >
              {loading === "pro" ? "Redirecting…" : "Get Pro Annual — $9.99/yr"}
            </button>
          )}
        </div>

        {/* Founding Member */}
        <div className={`bg-white rounded-2xl border-2 shadow-sm p-8 relative ${foundingFull ? "border-gray-200 opacity-60" : "border-amber-300"}`}>
          {!foundingFull && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full">
                {spotsLeft} SPOTS LEFT
              </span>
            </div>
          )}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#0f2a4a] mb-1">Founding Member</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-[#0f2a4a]">$29</span>
              <span className="text-gray-400 text-sm">one-time</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              {foundingFull
                ? "All founding spots have been claimed."
                : `First ${FOUNDING_LIMIT} users only. Pay once, Pro forever.`}
            </p>
          </div>
          <ul className="flex flex-col gap-3 mb-8 text-gray-600">
            <Checkmark text="Everything in Pro, forever" />
            <Checkmark text="No renewals, ever" />
            <Checkmark text="Name in ForaHub credits" />
            <Checkmark text="Early access to new features" />
          </ul>
          {tier === "founding" ? (
            <div className="text-sm text-center text-amber-600 py-2.5 border border-amber-300 rounded-lg font-semibold">
              ✓ You are a Founding Member
            </div>
          ) : isProOrFounding || foundingFull ? (
            <div className="text-sm text-center text-gray-400 py-2.5 border border-gray-200 rounded-lg font-medium">
              {foundingFull ? "Sold out" : "Not available"}
            </div>
          ) : (
            <button
              onClick={() => startCheckout("founding")}
              disabled={loading !== null || foundingFull}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold py-3 rounded-lg transition-colors text-sm"
            >
              {loading === "founding" ? "Redirecting…" : "Claim Founding Spot — $29"}
            </button>
          )}
        </div>
      </div>

      {/* Money-back guarantee */}
      <div className="mt-10 flex justify-center">
        <div className="inline-flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span><strong>30-day money-back guarantee.</strong> Not happy? Email us for a full refund, no questions asked.</span>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-[#0f2a4a] mb-6 text-center">Common questions</h2>
        <div className="flex flex-col gap-5">
          {[
            {
              q: "What happens after my 7-day trial?",
              a: "You automatically move to the free tier — no charge, no credit card required. The free tier shows events in the next 30 days.",
            },
            {
              q: "Can I cancel Pro Annual?",
              a: "Yes, anytime. You keep access until the end of your billing period. Or email us for a full refund within 30 days.",
            },
            {
              q: "What is the Founding Member limit?",
              a: `The first ${FOUNDING_LIMIT} paying users get lifetime Pro access for a single $29 payment. Once those spots are gone, this tier is closed.`,
            },
            {
              q: "What payment methods are accepted?",
              a: "All major credit and debit cards via Stripe. Payments are secure and encrypted.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 pb-5">
              <p className="font-semibold text-[#0f2a4a] text-sm mb-1">{q}</p>
              <p className="text-gray-500 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
