"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Plus, Trash2, FileText } from "lucide-react";

interface Abstract {
  id: string;
  event_name: string;
  title: string;
  submission_date: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
}

const STATUSES = ["Draft", "Submitted", "Under Review", "Accepted", "Rejected", "Presenting"];
const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  Submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Under Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Accepted: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Presenting: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default function AbstractsPage() {
  const { userId, isLoading } = useSubscription();
  const router = useRouter();
  const [abstracts, setAbstracts] = useState<Abstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ event_name: "", title: "", deadline: "", notes: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isLoading && !userId) router.push("/auth/signin");
  }, [isLoading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("abstracts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAbstracts((data as Abstract[] | null) ?? []);
        setLoading(false);
      });
  }, [userId]);

  async function addAbstract(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setAdding(true);
    const { data } = await supabase
      .from("abstracts")
      .insert({
        user_id: userId,
        event_name: form.event_name,
        title: form.title,
        deadline: form.deadline || null,
        notes: form.notes || null,
        status: "Draft",
      })
      .select()
      .single();
    setAdding(false);
    if (data) {
      setAbstracts(prev => [data as Abstract, ...prev]);
      setForm({ event_name: "", title: "", deadline: "", notes: "" });
      setShowForm(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("abstracts").update({ status }).eq("id", id);
    setAbstracts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteAbstract(id: string) {
    await supabase.from("abstracts").delete().eq("id", id);
    setAbstracts(prev => prev.filter(a => a.id !== id));
  }

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = abstracts.filter(a => a.status === s);
    return acc;
  }, {} as Record<string, Abstract[]>);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <FileText size={24} /> Abstract Tracker
            </h1>
            <p className="text-blue-200 text-sm mt-1">Track your conference abstract submissions</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
            <Plus size={15} /> New Submission
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-5 mb-6">
            <h2 className="font-bold text-[#0f2a4a] dark:text-white mb-4">Add New Submission</h2>
            <form onSubmit={addAbstract} className="space-y-3">
              <input required value={form.event_name} onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))}
                placeholder="Conference / Event Name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]" />
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Abstract Title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]" />
                </div>
              </div>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optional)" rows={2} resize-none
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de] resize-none" />
              <div className="flex gap-2">
                <button type="submit" disabled={adding}
                  className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                  {adding ? "Adding…" : "Add Submission"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!loading && abstracts.length === 0 && !showForm && (
          <div className="text-center py-20">
            <FileText size={48} className="text-gray-300 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-semibold text-gray-500">No abstract submissions yet</p>
            <p className="text-sm text-gray-400 mt-1">Track your conference abstract submissions in one place.</p>
          </div>
        )}

        {/* Kanban board */}
        {abstracts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {STATUSES.map(status => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                  <span className="text-xs text-gray-400">{grouped[status].length}</span>
                </div>
                <div className="space-y-2">
                  {grouped[status].map(abs => (
                    <div key={abs.id} className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-3">
                      <p className="text-xs font-semibold text-[#0f2a4a] dark:text-white line-clamp-1">{abs.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{abs.event_name}</p>
                      {abs.deadline && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Due: {new Date(abs.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <select value={abs.status} onChange={e => updateStatus(abs.id, e.target.value)}
                          className="flex-1 text-xs bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-md px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none">
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => deleteAbstract(abs.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {grouped[status].length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 dark:border-[#334155] rounded-xl p-4 text-xs text-gray-400 text-center">
                      None
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
