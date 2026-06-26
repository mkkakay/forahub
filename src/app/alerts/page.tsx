"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Bell, Plus, Trash2, Lock, Check, Pause } from "lucide-react";
import Link from "next/link";
import ClientPageHeader from "@/components/ClientPageHeader";

interface Alert {
  id: string;
  keyword: string;
  region_filter: string | null;
  format_filter: string | null;
  notification_type: string;
  is_active: boolean;
  created_at: string;
}

const REGIONS = ["Africa", "Asia-Pacific", "Middle East", "Americas", "Europe", "Online"];
const FORMATS = ["in_person", "virtual", "hybrid"];

export default function AlertsPage() {
  const { userId, hasFullAccess, isLoading } = useSubscription();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("");
  const [format, setFormat] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !userId) router.push("/auth/signin");
  }, [isLoading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("keyword_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAlerts((data as Alert[] | null) ?? []);
        setLoading(false);
      });
  }, [userId]);

  const maxAlerts = hasFullAccess ? 100 : 5;
  const canAddMore = alerts.length < maxAlerts;

  async function addAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !userId) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("keyword_alerts")
      .insert({
        user_id: userId,
        keyword: keyword.trim(),
        region_filter: region || null,
        format_filter: format || null,
        notification_type: "email",
        is_active: true,
      })
      .select()
      .single();
    setAdding(false);
    if (!error && data) {
      setAlerts(prev => [data as Alert, ...prev]);
      setKeyword(""); setRegion(""); setFormat("");
    }
  }

  async function deleteAlert(id: string) {
    await supabase.from("keyword_alerts").delete().eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  async function toggleAlert(id: string, current: boolean) {
    await supabase.from("keyword_alerts").update({ is_active: !current }).eq("id", id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <ClientPageHeader
        pageKey="alerts"
        title="Keyword Alerts"
        subtitle="Get notified when new matching events are added."
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 mb-6">
              <h2 className="font-bold text-[#0f2a4a] dark:text-white mb-4">Add New Alert</h2>
              {!canAddMore ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <Lock size={16} className="text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Free users can have up to 5 alerts.{" "}
                    <Link href="/pricing" className="font-semibold underline">Upgrade to Pro</Link> for unlimited alerts.
                  </p>
                </div>
              ) : (
                <form onSubmit={addAlert} className="space-y-3">
                  <label htmlFor="alert-keyword" className="sr-only">Keyword to match</label>
                  <input
                    id="alert-keyword"
                    value={keyword} onChange={e => setKeyword(e.target.value)}
                    placeholder="e.g. antimicrobial resistance, health financing, climate"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                    required
                  />
                  <div className="flex gap-2">
                    <label htmlFor="alert-region" className="sr-only">Region filter</label>
                    <select
                      id="alert-region"
                      value={region} onChange={e => setRegion(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                    >
                      <option value="">All regions</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <label htmlFor="alert-format" className="sr-only">Format filter</label>
                    <select
                      id="alert-format"
                      value={format} onChange={e => setFormat(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                    >
                      <option value="">All formats</option>
                      {FORMATS.map(f => <option key={f} value={f}>{f.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={adding || !keyword.trim()}
                    className="flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                    <Plus size={15} /> {adding ? "Adding…" : "Add Alert"}
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#0f2a4a] dark:text-white">Your Alerts</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">{alerts.length}/{maxAlerts}</span>
              </div>
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell size={36} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" aria-hidden="true" />
                  <p className="text-base font-semibold text-[#0f2a4a] dark:text-white">No alerts yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                    Create one to get an email when a new event matches your keyword.
                  </p>
                  {canAddMore && (
                    <a
                      href="#alert-keyword"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("alert-keyword")?.focus();
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Plus size={14} aria-hidden="true" /> Create your first alert
                    </a>
                  )}
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id}
                    className={`flex items-center gap-3 bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 ${
                      alert.is_active ? "border-gray-200 dark:border-slate-700" : "border-gray-100 dark:border-slate-800 opacity-50"
                    }`}>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-[#0f2a4a] dark:text-white">{alert.keyword}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {[alert.region_filter, alert.format_filter?.replace("_", " ")].filter(Boolean).join(" · ") || "All regions & formats"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAlert(alert.id, alert.is_active)}
                      aria-label={alert.is_active ? `Pause alert for "${alert.keyword}"` : `Resume alert for "${alert.keyword}"`}
                      aria-pressed={alert.is_active}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        alert.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {/* Icon + text so the state reads in monochrome too. */}
                      {alert.is_active ? <Check size={11} aria-hidden="true" /> : <Pause size={11} aria-hidden="true" />}
                      {alert.is_active ? "Active" : "Paused"}
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      aria-label={`Delete alert for "${alert.keyword}"`}
                      className="p-1.5 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
