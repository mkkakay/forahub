"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  MapPin,
  Building2,
  Tag,
  Trash2,
  Plus,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import CalendarExportMenu from "@/components/CalendarExportMenu";
import ShareMenu from "@/components/ShareMenu";

type AttendanceStatus = "interested" | "registered" | "attended";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  organization: string | null;
  sdg_goals: number[];
  event_type: string;
  format: string;
  registration_url: string | null;
  is_featured: boolean;
  created_at: string;
  registration_deadline: string | null;
}

interface SavedWithEvent {
  id: string;
  event_id: string;
  status: AttendanceStatus | null;
  notes: string | null;
  reminder_date: string | null;
  created_at: string;
  event: EventRow;
}

interface CollectionWithEvents {
  id: string;
  name: string;
  created_at: string;
  collection_events: { event_id: string }[];
}

const SDG_META: Record<number, { label: string; color: string }> = {
  1:  { label: "No Poverty",              color: "bg-red-100 text-red-800" },
  2:  { label: "Zero Hunger",             color: "bg-yellow-100 text-yellow-800" },
  3:  { label: "Good Health",             color: "bg-green-100 text-green-800" },
  4:  { label: "Quality Education",       color: "bg-red-100 text-red-800" },
  5:  { label: "Gender Equality",         color: "bg-orange-100 text-orange-800" },
  6:  { label: "Clean Water",             color: "bg-cyan-100 text-cyan-800" },
  7:  { label: "Affordable Energy",       color: "bg-amber-100 text-amber-800" },
  8:  { label: "Decent Work",             color: "bg-rose-100 text-rose-800" },
  9:  { label: "Industry & Innovation",   color: "bg-orange-100 text-orange-800" },
  10: { label: "Reduced Inequalities",    color: "bg-pink-100 text-pink-800" },
  11: { label: "Sustainable Cities",      color: "bg-amber-100 text-amber-800" },
  12: { label: "Responsible Consumption", color: "bg-lime-100 text-lime-800" },
  13: { label: "Climate Action",          color: "bg-green-100 text-green-800" },
  14: { label: "Life Below Water",        color: "bg-blue-100 text-blue-800" },
  15: { label: "Life on Land",            color: "bg-lime-100 text-lime-800" },
  16: { label: "Peace & Justice",         color: "bg-purple-100 text-purple-800" },
  17: { label: "Partnerships",            color: "bg-indigo-100 text-indigo-800" },
};

const FORMAT_LABELS: Record<string, string> = {
  in_person: "In Person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  if (!end) return fmt(start);
  const s = new Date(start);
  const e = new Date(end);
  if (s.getUTCFullYear() === e.getUTCFullYear() && s.getUTCMonth() === e.getUTCMonth()) {
    return `${s.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

function toDateInputValue(isoStr: string | null): string {
  if (!isoStr) return "";
  return isoStr.slice(0, 10);
}

// Collection dropdown for a single saved event card
function CollectionDropdown({
  eventId,
  collections,
  onCollectionsChange,
}: {
  eventId: string;
  collections: CollectionWithEvents[];
  onCollectionsChange: (updated: CollectionWithEvents[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  async function toggleCollection(collection: CollectionWithEvents) {
    const isIn = collection.collection_events.some(ce => ce.event_id === eventId);
    if (isIn) {
      await supabase
        .from("collection_events")
        .delete()
        .eq("collection_id", collection.id)
        .eq("event_id", eventId);
      onCollectionsChange(
        collections.map(c =>
          c.id === collection.id
            ? { ...c, collection_events: c.collection_events.filter(ce => ce.event_id !== eventId) }
            : c
        )
      );
    } else {
      await supabase
        .from("collection_events")
        .insert({ collection_id: collection.id, event_id: eventId });
      onCollectionsChange(
        collections.map(c =>
          c.id === collection.id
            ? { ...c, collection_events: [...c.collection_events, { event_id: eventId }] }
            : c
        )
      );
    }
  }

  const eventCollections = collections.filter(c =>
    c.collection_events.some(ce => ce.event_id === eventId)
  );

  return (
    <div ref={ref} className="relative inline-block">
      <div className="flex flex-wrap items-center gap-1.5">
        {eventCollections.map(c => (
          <span
            key={c.id}
            className="text-xs px-2 py-0.5 rounded-full bg-[#e8f4fc] text-[#3a95cc] font-medium"
          >
            {c.name}
          </span>
        ))}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(prev => !prev); }}
          className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-[#4ea8de] transition-colors px-1.5 py-0.5 rounded border border-gray-200 hover:border-[#4ea8de]"
        >
          <Plus size={11} />
          Add
          <ChevronDown size={11} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
          {collections.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No collections yet</p>
          ) : (
            collections.map(c => {
              const isIn = c.collection_events.some(ce => ce.event_id === eventId);
              return (
                <button
                  key={c.id}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); toggleCollection(c); }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${isIn ? "bg-[#4ea8de] border-[#4ea8de]" : "border-gray-300"}`}>
                    {isIn && <span className="text-white text-[9px] font-bold">✓</span>}
                  </span>
                  {c.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function SavedEventsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<SavedWithEvent[]>([]);
  const [collections, setCollections] = useState<CollectionWithEvents[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.push("/auth/signin");
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const [{ data: savedData }, { data: collData }] = await Promise.all([
        supabase
          .from("saved_events")
          .select("*, event:events(*)")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_collections")
          .select("*, collection_events(event_id)")
          .eq("user_id", uid),
      ]);

      if (savedData) setSavedEvents(savedData as SavedWithEvent[]);
      if (collData) setCollections(collData as CollectionWithEvents[]);
      setLoading(false);
    });
  }, [router]);

  async function updateStatus(savedEventId: string, status: AttendanceStatus) {
    setSavedEvents(prev =>
      prev.map(se => se.id === savedEventId ? { ...se, status } : se)
    );
    await supabase.from("saved_events").update({ status }).eq("id", savedEventId);
  }

  async function saveNotes(savedEventId: string) {
    const notes = pendingNotes[savedEventId] ?? "";
    setSavedEvents(prev =>
      prev.map(se => se.id === savedEventId ? { ...se, notes } : se)
    );
    setExpandedNotes(prev => { const n = new Set(prev); n.delete(savedEventId); return n; });
    await supabase.from("saved_events").update({ notes }).eq("id", savedEventId);
  }

  async function updateReminder(savedEventId: string, dateValue: string) {
    const reminder_date = dateValue ? new Date(dateValue).toISOString() : null;
    setSavedEvents(prev =>
      prev.map(se => se.id === savedEventId ? { ...se, reminder_date } : se)
    );
    await supabase.from("saved_events").update({ reminder_date }).eq("id", savedEventId);
  }

  async function removeEvent(savedEventId: string) {
    setSavedEvents(prev => prev.filter(se => se.id !== savedEventId));
    await supabase.from("saved_events").delete().eq("id", savedEventId);
  }

  async function createCollection() {
    const name = newCollectionName.trim();
    if (!name || !userId) return;
    const tempId = `temp-${Date.now()}`;
    const newColl: CollectionWithEvents = {
      id: tempId,
      name,
      created_at: new Date().toISOString(),
      collection_events: [],
    };
    setCollections(prev => [...prev, newColl]);
    setNewCollectionName("");
    const { data } = await supabase
      .from("user_collections")
      .insert({ user_id: userId, name })
      .select("*, collection_events(event_id)")
      .single();
    if (data) {
      setCollections(prev =>
        prev.map(c => c.id === tempId ? (data as CollectionWithEvents) : c)
      );
    }
  }

  // Events to display based on selected collection
  const displayedEvents = selectedCollectionId
    ? (() => {
        const coll = collections.find(c => c.id === selectedCollectionId);
        if (!coll) return [];
        const collEventIds = new Set(coll.collection_events.map(ce => ce.event_id));
        return savedEvents.filter(se => collEventIds.has(se.event_id));
      })()
    : savedEvents;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-[#4ea8de]" />
        <span className="ml-3 text-gray-500">Loading your saved events…</span>
      </div>
    );
  }

  if (savedEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Calendar size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg font-medium">No saved events yet</p>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          Browse events and click the bookmark icon to save them here.
        </p>
        <Link
          href="/events"
          className="mt-4 inline-block text-[#4ea8de] hover:text-[#3a95cc] text-sm font-medium transition-colors"
        >
          Browse events to save →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* All saved */}
          <button
            onClick={() => setSelectedCollectionId(null)}
            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
              selectedCollectionId === null
                ? "bg-[#4ea8de] text-white"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span>All Saved</span>
            <span className={`text-xs rounded-full px-2 py-0.5 ${selectedCollectionId === null ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {savedEvents.length}
            </span>
          </button>

          {/* Collections */}
          {collections.map(coll => (
            <button
              key={coll.id}
              onClick={() => setSelectedCollectionId(coll.id)}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between border-t border-gray-100 ${
                selectedCollectionId === coll.id
                  ? "bg-[#4ea8de] text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="truncate">{coll.name}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${selectedCollectionId === coll.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {coll.collection_events.length}
              </span>
            </button>
          ))}

          {/* Create collection */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={e => setNewCollectionName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createCollection(); }}
                placeholder="New collection…"
                className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4ea8de] min-w-0"
              />
              <button
                onClick={createCollection}
                disabled={!newCollectionName.trim()}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[#4ea8de] text-white hover:bg-[#3a95cc] transition-colors disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile tabs */}
      <div className="md:hidden w-full mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCollectionId(null)}
            className={`shrink-0 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
              selectedCollectionId === null
                ? "bg-[#4ea8de] text-white"
                : "bg-white border border-gray-200 text-gray-700"
            }`}
          >
            All ({savedEvents.length})
          </button>
          {collections.map(coll => (
            <button
              key={coll.id}
              onClick={() => setSelectedCollectionId(coll.id)}
              className={`shrink-0 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                selectedCollectionId === coll.id
                  ? "bg-[#4ea8de] text-white"
                  : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              {coll.name} ({coll.collection_events.length})
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {displayedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {selectedCollectionId ? "No events in this collection" : "No saved events"}
            </p>
            {selectedCollectionId && (
              <p className="text-gray-400 text-sm mt-1">
                Add events to this collection from your saved events list.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayedEvents.map(se => {
              const event = se.event;
              const primarySdg = event.sdg_goals?.[0];
              const sdgMeta = primarySdg ? SDG_META[primarySdg] : null;
              const isNotesExpanded = expandedNotes.has(se.id);
              const pendingNote = pendingNotes[se.id] ?? se.notes ?? "";

              return (
                <div
                  key={se.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 max-w-3xl"
                >
                  {/* Row 1: SDG tag + format + remove */}
                  <div className="flex items-center gap-2 mb-2">
                    {sdgMeta && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sdgMeta.color}`}>
                        <Tag size={10} />
                        SDG {primarySdg}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{FORMAT_LABELS[event.format] ?? event.format}</span>
                    <button
                      onClick={() => removeEvent(se.id)}
                      className="ml-auto p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
                      aria-label="Remove saved event"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Row 2: Title */}
                  <Link href={`/events/${event.id}`}>
                    <h3 className="text-[#0f2a4a] font-semibold text-base leading-snug hover:text-[#4ea8de] transition-colors mb-2">
                      {event.title}
                    </h3>
                  </Link>

                  {/* Row 3: Date / Location / Org */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400 shrink-0" />
                      {formatDateRange(event.start_date, event.end_date)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        {event.location}
                      </span>
                    )}
                    {event.organization && (
                      <span className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-gray-400 shrink-0" />
                        {event.organization}
                      </span>
                    )}
                  </div>

                  {/* Row 4: Status pills */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-400 font-medium">Status:</span>
                    {(["interested", "registered", "attended"] as AttendanceStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(se.id, s)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                          se.status === s
                            ? "bg-[#4ea8de] text-white border-[#4ea8de]"
                            : "border-gray-200 text-gray-500 hover:border-[#4ea8de] hover:text-[#4ea8de]"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Row 5: Collections */}
                  <div className="mb-3">
                    <CollectionDropdown
                      eventId={event.id}
                      collections={collections}
                      onCollectionsChange={setCollections}
                    />
                  </div>

                  {/* Row 6: Notes */}
                  <div className="mb-3">
                    {!isNotesExpanded ? (
                      <div className="flex items-center gap-2">
                        {se.notes ? (
                          <>
                            <p className="text-xs text-gray-500 line-clamp-1 flex-1">{se.notes}</p>
                            <button
                              onClick={() => {
                                setPendingNotes(prev => ({ ...prev, [se.id]: se.notes ?? "" }));
                                setExpandedNotes(prev => { const n = new Set(prev); n.add(se.id); return n; });
                              }}
                              className="text-xs text-[#4ea8de] hover:text-[#3a95cc] transition-colors shrink-0"
                            >
                              Edit
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setPendingNotes(prev => ({ ...prev, [se.id]: "" }));
                              setExpandedNotes(prev => { const n = new Set(prev); n.add(se.id); return n; });
                            }}
                            className="text-xs text-gray-400 hover:text-[#4ea8de] transition-colors"
                          >
                            + Add note
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={pendingNote}
                          onChange={e => setPendingNotes(prev => ({ ...prev, [se.id]: e.target.value }))}
                          rows={2}
                          placeholder="Add a note…"
                          className="text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#4ea8de] resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveNotes(se.id)}
                            className="text-xs font-medium px-3 py-1 rounded-md bg-[#4ea8de] text-white hover:bg-[#3a95cc] transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setPendingNotes(prev => { const n = { ...prev }; delete n[se.id]; return n; });
                              setExpandedNotes(prev => { const n = new Set(prev); n.delete(se.id); return n; });
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 7: Reminder */}
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Set reminder:</span>
                    <input
                      type="date"
                      defaultValue={toDateInputValue(se.reminder_date)}
                      onBlur={e => updateReminder(se.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4ea8de]"
                    />
                    {se.reminder_date && (
                      <>
                        <span className="text-xs text-[#4ea8de]">
                          {new Date(se.reminder_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                        <button
                          onClick={() => updateReminder(se.id, "")}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>

                  {/* Row 8: Action buttons */}
                  <div className="flex items-center justify-end gap-0.5 pt-2 border-t border-gray-100">
                    <CalendarExportMenu
                      title={event.title}
                      startDate={event.start_date}
                      endDate={event.end_date}
                      location={event.location}
                      description={event.description}
                      registrationUrl={event.registration_url}
                    />
                    <ShareMenu eventId={event.id} eventTitle={event.title} startDate={event.start_date} location={event.location} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
