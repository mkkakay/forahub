"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/context/SubscriptionContext";
import { Check, ArrowRight } from "lucide-react";

const SDG_LIST = [
  { n: 1,  label: "No Poverty" },
  { n: 2,  label: "Zero Hunger" },
  { n: 3,  label: "Good Health & Well-being" },
  { n: 4,  label: "Quality Education" },
  { n: 5,  label: "Gender Equality" },
  { n: 6,  label: "Clean Water & Sanitation" },
  { n: 7,  label: "Affordable & Clean Energy" },
  { n: 8,  label: "Decent Work & Economic Growth" },
  { n: 9,  label: "Industry, Innovation & Infrastructure" },
  { n: 10, label: "Reduced Inequalities" },
  { n: 11, label: "Sustainable Cities & Communities" },
  { n: 12, label: "Responsible Consumption" },
  { n: 13, label: "Climate Action" },
  { n: 14, label: "Life Below Water" },
  { n: 15, label: "Life on Land" },
  { n: 16, label: "Peace, Justice & Strong Institutions" },
  { n: 17, label: "Partnerships for the Goals" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { userId, isLoading } = useSubscription();
  const [step, setStep] = useState(1);
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([]);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !userId) {
      router.push("/auth/signup");
    }
  }, [isLoading, userId, router]);

  function toggleSdg(n: number) {
    setSelectedSdgs(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  }

  async function savePreferencesAndNext() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("user_preferences").upsert({
      user_id: userId,
      sdg_goals: selectedSdgs,
      event_types: [],
      regions: [],
      email_alerts: emailAlerts,
    }, { onConflict: "user_id" });
    setSaving(false);
    setStep(3);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4ea8de] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <nav className="bg-[#0f2a4a] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="text-white text-xl font-bold tracking-tight">
              Fora<span className="text-[#4ea8de]">Hub</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s < step ? "bg-green-500 text-white" :
                s === step ? "bg-[#4ea8de] text-white" :
                "bg-gray-200 text-gray-400"
              }`}>
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-lg">
          {/* Step 1: SDG Interests */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-[#0f2a4a] mb-1">Choose your SDG interests</h2>
              <p className="text-gray-500 text-sm mb-6">
                We&apos;ll surface relevant events for you. Pick as many as you like.
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
                {SDG_LIST.map(({ n, label }) => (
                  <button
                    key={n}
                    onClick={() => toggleSdg(n)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                      selectedSdgs.includes(n)
                        ? "border-[#4ea8de] bg-blue-50 text-[#0f2a4a] font-medium"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-6 h-6 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {n}
                    </span>
                    {label}
                    {selectedSdgs.includes(n) && (
                      <Check size={14} className="ml-auto text-[#4ea8de] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {selectedSdgs.length === 0 ? "Skip for now" : `Continue with ${selectedSdgs.length} selected`}
                <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* Step 2: Email alerts */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-[#0f2a4a] mb-1">Stay in the loop</h2>
              <p className="text-gray-500 text-sm mb-6">
                Get a weekly digest of upcoming SDG events tailored to your interests.
              </p>
              <button
                onClick={() => setEmailAlerts(prev => !prev)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-colors mb-3 ${
                  emailAlerts
                    ? "border-[#4ea8de] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  emailAlerts ? "border-[#4ea8de] bg-[#4ea8de]" : "border-gray-300"
                }`}>
                  {emailAlerts && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-[#0f2a4a] text-sm">Weekly digest email</p>
                  <p className="text-gray-400 text-xs mt-0.5">Events coming up across your SDG interests</p>
                </div>
              </button>
              <p className="text-xs text-gray-400 mb-6">
                Weekly digest requires a Pro account. You can enable it now and it will activate when you upgrade.
              </p>
              <button
                onClick={savePreferencesAndNext}
                disabled={saving}
                className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving ? "Saving…" : "Continue"}
                <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* Step 3: Upgrade options */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-[#0f2a4a] mb-1">Your account is ready</h2>
              <p className="text-gray-500 text-sm mb-6">
                You have a 7-day Pro trial — full access to the 24-month calendar. Here&apos;s what that unlocks:
              </p>
              <ul className="flex flex-col gap-3 mb-6">
                {[
                  "Full 24-month event calendar",
                  "Unlimited saved events & collections",
                  "Calendar export to Google, Outlook, Apple",
                  "Deadline reminders",
                  "Weekly digest email",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check size={15} className="text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm">
                <p className="text-[#0f2a4a] font-semibold mb-1">After your 7-day trial</p>
                <p className="text-gray-500">
                  You&apos;ll move to the free tier (30-day calendar). Upgrade to Pro Annual for $9.99/year to keep full access.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/pricing"
                  className="block text-center bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold py-3 rounded-lg text-sm transition-colors"
                >
                  View Pricing — from $9.99/year
                </Link>
                <Link
                  href="/events"
                  className="block text-center border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3 rounded-lg text-sm transition-colors"
                >
                  Start exploring events →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
