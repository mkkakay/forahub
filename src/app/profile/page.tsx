"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Save, AlertTriangle, Copy, Check } from "lucide-react";
import Link from "next/link";

const ROLES = ["Researcher", "Practitioner", "Policy Advisor", "Programme Officer", "Consultant", "Student", "Donor", "Other"];
const REGIONS = ["Africa", "Asia-Pacific", "Middle East", "Americas", "Europe", "Pacific Islands", "Other"];
const SDG_LABELS: Record<number, string> = {
  1:"No Poverty",2:"Zero Hunger",3:"Good Health",4:"Quality Education",5:"Gender Equality",
  6:"Clean Water",7:"Affordable Energy",8:"Decent Work",9:"Industry & Innovation",10:"Reduced Inequalities",
  11:"Sustainable Cities",12:"Responsible Consumption",13:"Climate Action",14:"Life Below Water",
  15:"Life on Land",16:"Peace & Justice",17:"Partnerships"
};

export default function ProfilePage() {
  const { userId, userEmail, isLoading } = useSubscription();
  const router = useRouter();
  const [profile, setProfile] = useState({ full_name: "", job_title: "", organization: "", region: "", bio: "", role: "", sdg_interests: [] as number[] });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !userId) router.push("/auth/signin");
  }, [isLoading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("*").eq("id", userId).single().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name ?? "",
          job_title: data.job_title ?? "",
          organization: data.organization ?? "",
          region: data.region ?? "",
          bio: data.bio ?? "",
          role: data.role ?? "",
          sdg_interests: data.sdg_interests ?? [],
        });
        setReferralCode(data.referral_code ?? "");
      }
    });
  }, [userId]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    await supabase.from("profiles").update(profile).eq("id", userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleSDG(sdg: number) {
    setProfile(p => ({
      ...p,
      sdg_interests: p.sdg_interests.includes(sdg)
        ? p.sdg_interests.filter(s => s !== sdg)
        : [...p.sdg_interests, sdg]
    }));
  }

  function copyReferral() {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function deleteAccount() {
    setDeleteLoading(true);
    await supabase.from("saved_events").delete().eq("user_id", userId!);
    await supabase.from("keyword_alerts").delete().eq("user_id", userId!);
    await supabase.from("abstracts").delete().eq("user_id", userId!);
    await supabase.from("notifications").delete().eq("user_id", userId!);
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold text-white">My Profile</h1>
          <p className="text-blue-200 text-sm mt-1">{userEmail}</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <form onSubmit={saveProfile} className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-6 space-y-4">
          <h2 className="font-bold text-[#0f2a4a] dark:text-white">Personal Information</h2>
          {[
            { id: "full_name", label: "Full Name", placeholder: "Your full name" },
            { id: "job_title", label: "Job Title", placeholder: "e.g. Programme Officer" },
            { id: "organization", label: "Organization", placeholder: "e.g. WHO, UNICEF, NGO name" },
          ].map(({ id, label, placeholder }) => (
            <div key={id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input
                value={(profile as Record<string, unknown>)[id] as string}
                onChange={e => setProfile(p => ({ ...p, [id]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              rows={3}
              placeholder="Brief bio for your profile…"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Region</label>
              <select value={profile.region} onChange={e => setProfile(p => ({ ...p, region: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]">
                <option value="">Select region</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select value={profile.role} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]">
                <option value="">Select role</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SDG Interests</label>
            <div className="flex flex-wrap gap-2">
              {Array.from({length: 17}, (_, i) => i + 1).map(sdg => (
                <button type="button" key={sdg} onClick={() => toggleSDG(sdg)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    profile.sdg_interests.includes(sdg)
                      ? "text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:opacity-80"
                  }`}
                  style={profile.sdg_interests.includes(sdg) ? { backgroundColor: `hsl(${sdg * 21}, 70%, 45%)` } : {}}>
                  {sdg} {SDG_LABELS[sdg].split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
            {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> {saving ? "Saving…" : "Save Changes"}</>}
          </button>
        </form>

        {/* Referral */}
        {referralCode && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-5">
            <h2 className="font-bold text-[#0f2a4a] dark:text-white mb-2">Referral Program</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Share your link. When someone upgrades to Pro, you get 1 free month.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 truncate">
                {typeof window !== "undefined" ? `${window.location.origin}/?ref=${referralCode}` : `forahub.org/?ref=${referralCode}`}
              </code>
              <button onClick={copyReferral}
                className="flex items-center gap-1.5 bg-[#4ea8de] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#3a95cc] transition-colors shrink-0">
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/alerts", label: "Keyword Alerts" },
            { href: "/abstracts", label: "Abstract Tracker" },
            { href: "/dashboard", label: "My Dashboard" },
            { href: "/pricing", label: "Upgrade Plan" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-4 text-sm font-semibold text-[#0f2a4a] dark:text-white hover:border-[#4ea8de] hover:text-[#4ea8de] transition-colors text-center">
              {label}
            </Link>
          ))}
        </div>

        {/* Delete account */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-red-200 dark:border-red-900/50 p-5">
          <h2 className="font-bold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Danger Zone
          </h2>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} className="text-sm text-red-600 hover:underline">
              Delete my account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">This will permanently delete your account and all data. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={deleteAccount} disabled={deleteLoading}
                  className="text-sm font-semibold px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-60 transition-colors">
                  {deleteLoading ? "Deleting…" : "Yes, delete my account"}
                </button>
                <button onClick={() => setShowDelete(false)} className="text-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
