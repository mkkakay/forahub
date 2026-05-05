"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Bell, Check, Trash2 } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  event_id: string | null;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { userId, isLoading } = useSubscription();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !userId) router.push("/auth/signin");
  }, [isLoading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications((data as Notification[] | null) ?? []);
        setLoading(false);
      });
  }, [userId]);

  async function markAllRead() {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function deleteNotification(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Bell size={24} />
              Notifications
              {unread > 0 && (
                <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-red-500 text-white">{unread}</span>
              )}
            </h1>
            <p className="text-blue-200 text-sm mt-1">Your recent activity and updates</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors">
              <Check size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && notifications.length === 0 && (
          <div className="text-center py-20">
            <Bell size={48} className="text-gray-300 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-semibold text-gray-500">You&apos;re all caught up!</p>
            <p className="text-sm text-gray-400 mt-1">Notifications about your saved events will appear here.</p>
            <Link href="/events" className="mt-4 inline-block text-[#4ea8de] hover:underline text-sm">Browse events</Link>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => { if (!n.read) markRead(n.id); }}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                n.read
                  ? "bg-white dark:bg-[#1e293b] border-gray-200 dark:border-[#334155]"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
              }`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? "bg-gray-300" : "bg-blue-500"}`} />
              <div className="flex-1 min-w-0">
                {n.event_id ? (
                  <Link href={`/events/${n.event_id}`} className="font-semibold text-sm text-[#0f2a4a] dark:text-white hover:text-[#4ea8de] transition-colors">
                    {n.title}
                  </Link>
                ) : (
                  <p className="font-semibold text-sm text-[#0f2a4a] dark:text-white">{n.title}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.created_at)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
