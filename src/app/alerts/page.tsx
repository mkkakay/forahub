"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Bell, Plus, Trash2, Lock } from "lucide-react";
import Link from "next/link";

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
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Bell size={24} className="text-[#4ea8de]" />
            <h1 className="text-3xl font-extrabold text-white">Keyword Alerts</h1>
          </div>
          <p className="text-blue-200 text-sm">Get notified when new matching events are added.</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && (
          <>
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-5 mb-6">
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
                  <input
                    value={keyword} onChange={e => setKeyword(e.target.value)}
                    placeholder="e.g. antimicrobial resistance, health financing, climate"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                    required
                  />
                  <div className="flex gap-2">
                    <select value={region} onChange={e => setRegion(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]">
                      <option value="">All regions</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={format} onChange={e => setFormat(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]">
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
                <div className="text-center py-12 text-gray-400">
                  <Bell size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No alerts yet. Add one above.</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id}
                    className={`flex items-center gap-3 bg-white dark:bg-[#1e293b] border rounded-xl px-4 py-3 ${
                      alert.is_active ? "border-gray-200 dark:border-[#334155]" : "border-gray-100 dark:border-[#1e293b] opacity-50"
                    }`}>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-[#0f2a4a] dark:text-white">{alert.keyword}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {[alert.region_filter, alert.format_filter?.replace("_", " ")].filter(Boolean).join(" · ") || "All regions & formats"}
                      </p>
                    </div>
                    <button onClick={() => toggleAlert(alert.id, alert.is_active)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        alert.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                      {alert.is_active ? "Active" : "Paused"}
                    </button>
                    <button onClick={() => deleteAlert(alert.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
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
