"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { supabase } from "@/lib/supabase/client";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";

const SDG_LABELS: Record<number, string> = {
  1:"No Poverty",2:"Zero Hunger",3:"Good Health",4:"Quality Education",5:"Gender Equality",
  6:"Clean Water",7:"Affordable Energy",8:"Decent Work",9:"Industry & Innovation",10:"Reduced Inequalities",
  11:"Sustainable Cities",12:"Responsible Consumption",13:"Climate Action",14:"Life Below Water",
  15:"Life on Land",16:"Peace & Justice",17:"Partnerships"
};
const SDG_COLORS: Record<number, string> = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",6:"#26BDE2",7:"#FCC30B",8:"#A21942",
  9:"#FD6925",10:"#DD1367",11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",16:"#00689D",17:"#19486A"
};
const TIMEZONES = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Africa/Nairobi", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo"];
const EVENT_TYPES = ["conference", "side_event", "webinar", "training", "consultation", "summit"];
const FORMATS = ["in_person", "virtual", "hybrid"];
const ORG_TYPES = ["UN Agency", "NGO", "Government", "Academic", "Multilateral", "Private Sector", "Other"];

interface FormData {
  title: string;
  description: string;
  event_type: string;
  format: string;
  start_date: string;
  end_date: string;
  timezone: string;
  location: string;
  registration_url: string;
  registration_deadline: string;
  sdg_goals: number[];
  region: string;
  organization: string;
  org_website: string;
  org_type: string;
  contact_email: string;
}

const STEPS = ["Basic Details", "Date & Location", "Categories", "Organizer", "Review"];

export default function CreateEventPage() {
  const { userId } = useSubscription();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>({
    title: "", description: "", event_type: "conference", format: "in_person",
    start_date: "", end_date: "", timezone: "UTC", location: "", registration_url: "",
    registration_deadline: "", sdg_goals: [], region: "", organization: "",
    org_website: "", org_type: "NGO", contact_email: "",
  });

  function update(field: keyof FormData, value: string | number[]) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function toggleSDG(sdg: number) {
    setForm(p => ({
      ...p,
      sdg_goals: p.sdg_goals.includes(sdg)
        ? p.sdg_goals.filter(s => s !== sdg)
        : [...p.sdg_goals, sdg],
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const { error } = await supabase.from("events").insert({
      title: form.title,
      description: form.description,
      event_type: form.event_type as "conference",
      format: form.format as "in_person",
      start_date: form.start_date,
      end_date: form.end_date || null,
      location: form.location || null,
      organization: form.organization || null,
      sdg_goals: form.sdg_goals,
      region: form.region || null,
      registration_url: form.registration_url || null,
      registration_deadline: form.registration_deadline || null,
      status: "pending",
      is_featured: false,
      is_public: true,
      language: "en",
      is_side_event: form.event_type === "side_event",
      is_recurring: false,
      sdg_inferred: false,
    });
    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      if (form.contact_email) {
        await fetch("/api/send-welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.contact_email, eventName: form.title }),
        });
      }
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]";

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={28} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#0f2a4a] dark:text-white mb-3">Event Submitted!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Thank you for submitting <strong>{form.title}</strong>. Our team will review it within 48 hours.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Once approved, it will appear in ForaHub with a &ldquo;Community Submitted&rdquo; badge.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/events" className="bg-[#4ea8de] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#3a95cc] transition-colors">
              Browse Events
            </Link>
            <button onClick={() => { setSubmitted(false); setStep(0); setForm({ title:"",description:"",event_type:"conference",format:"in_person",start_date:"",end_date:"",timezone:"UTC",location:"",registration_url:"",registration_deadline:"",sdg_goals:[],region:"",organization:"",org_website:"",org_type:"NGO",contact_email:"" }); }}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold text-white">Submit an Event</h1>
          <p className="text-blue-200 text-sm mt-1">List your global development event on ForaHub</p>
          <div className="flex items-center gap-2 mt-5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? "bg-green-500 text-white" : i === step ? "bg-[#4ea8de] text-white" : "bg-white/20 text-white/60"
                }`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === step ? "text-white font-medium" : "text-white/50"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-white/20" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-[#0f2a4a] dark:text-white">Basic Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title *</label>
                <input value={form.title} onChange={e => update("title", e.target.value)} className={inputClass} placeholder="e.g. World Health Assembly 2027 Side Event on AMR" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => update("description", e.target.value)} rows={4}
                  className={`${inputClass} resize-none`} placeholder="Describe the event, its goals, audience, and key topics…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type</label>
                  <select value={form.event_type} onChange={e => update("event_type", e.target.value)} className={inputClass}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
                  <select value={form.format} onChange={e => update("format", e.target.value)} className={inputClass}>
                    {FORMATS.map(f => <option key={f} value={f}>{f.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-[#0f2a4a] dark:text-white">Date & Location</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => update("end_date", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                <select value={form.timezone} onChange={e => update("timezone", e.target.value)} className={inputClass}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input value={form.location} onChange={e => update("location", e.target.value)} className={inputClass}
                  placeholder={form.format === "virtual" ? "Online" : "City, Country or venue name"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration URL</label>
                <input type="url" value={form.registration_url} onChange={e => update("registration_url", e.target.value)} className={inputClass} placeholder="https://…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Deadline</label>
                <input type="date" value={form.registration_deadline} onChange={e => update("registration_deadline", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-[#0f2a4a] dark:text-white">Categories</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SDG Goals (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({length: 17}, (_, i) => i + 1).map(sdg => (
                    <button type="button" key={sdg} onClick={() => toggleSDG(sdg)}
                      className={`text-xs px-2.5 py-1.5 rounded-full font-semibold transition-colors ${
                        form.sdg_goals.includes(sdg) ? "text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                      style={form.sdg_goals.includes(sdg) ? { backgroundColor: SDG_COLORS[sdg] } : {}}>
                      {sdg} — {SDG_LABELS[sdg]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Region</label>
                <select value={form.region} onChange={e => update("region", e.target.value)} className={inputClass}>
                  <option value="">Select region</option>
                  {["Africa", "Asia-Pacific", "Middle East", "Americas", "Europe", "Pacific Islands", "Global"].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-[#0f2a4a] dark:text-white">Organizer Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Name *</label>
                <input value={form.organization} onChange={e => update("organization", e.target.value)} className={inputClass} placeholder="e.g. World Health Organization" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                  <input type="url" value={form.org_website} onChange={e => update("org_website", e.target.value)} className={inputClass} placeholder="https://…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Type</label>
                  <select value={form.org_type} onChange={e => update("org_type", e.target.value)} className={inputClass}>
                    {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email</label>
                <input type="email" value={form.contact_email} onChange={e => update("contact_email", e.target.value)} className={inputClass} placeholder="events@organization.org" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-[#0f2a4a] dark:text-white">Review & Submit</h2>
              <div className="bg-gray-50 dark:bg-[#0f172a] rounded-xl p-4 space-y-2 text-sm">
                <p><strong>Title:</strong> {form.title}</p>
                <p><strong>Type:</strong> {form.event_type} · {form.format}</p>
                <p><strong>Date:</strong> {form.start_date}{form.end_date ? ` – ${form.end_date}` : ""}</p>
                <p><strong>Location:</strong> {form.location || "Not specified"}</p>
                <p><strong>Organization:</strong> {form.organization}</p>
                <p><strong>SDG Goals:</strong> {form.sdg_goals.length > 0 ? form.sdg_goals.map(s => `SDG ${s}`).join(", ") : "None selected"}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
                After submission, our team will review your event within 48 hours. You&apos;ll receive a confirmation email once approved.
              </div>
              {!userId && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
                  You&apos;re not signed in. <Link href="/auth/signup" className="font-semibold underline">Create an account</Link> to track your submissions.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={15} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !form.title.trim()}
              className="flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title || !form.start_date || !form.organization}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Check size={15} /> {submitting ? "Submitting…" : "Submit Event"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
