"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown,
  Eye, EyeOff, Loader2, AlertCircle, X, Upload, Link as LinkIcon, Circle,
  Microscope, FileText, ClipboardList, HandCoins, Landmark, Briefcase,
  GraduationCap, Megaphone, type LucideIcon,
} from "lucide-react";

interface AudienceCard {
  id: string;
  label: string;
  icon: string | null;
  image_url: string | null;
  link_url: string | null;
  bg_class: string | null;
  icon_color_class: string | null;
  sort_order: number;
  is_active: boolean;
}

// Same lookup the public about page uses — kept in sync there.
const ICON_MAP: Record<string, LucideIcon> = {
  Microscope, FileText, ClipboardList, Users, HandCoins,
  Landmark, Briefcase, GraduationCap, Megaphone,
};

function iconFor(name: string | null): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Circle;
}

export default function AudienceCardsPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<AudienceCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pasteUrls, setPasteUrls] = useState<Record<string, string>>({});

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audience-cards", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setCards((json.data ?? []) as AudienceCard[]);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function patchCard(id: string, body: Partial<AudienceCard>): Promise<AudienceCard | null> {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/audience-cards", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const updated = json.data as AudienceCard;
      setCards(cs => cs.map(c => (c.id === id ? updated : c)));
      return updated;
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function addCard() {
    setError(null);
    try {
      const res = await fetch("/api/admin/audience-cards", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ label: "New audience" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setCards(cs => [...cs, json.data as AudienceCard]);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  async function deleteCard(card: AudienceCard) {
    if (!window.confirm(`Delete "${card.label}"? This removes it from the /about page.`)) return;
    setError(null);
    setBusyId(card.id);
    try {
      const res = await fetch("/api/admin/audience-cards", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setCards(cs => cs.filter(c => c.id !== card.id));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyId(null);
    }
  }

  // Swap sort_order with the adjacent card. No UNIQUE constraint on
  // sort_order, so two PATCH calls in sequence are safe.
  async function move(card: AudienceCard, direction: -1 | 1) {
    const idx = cards.findIndex(c => c.id === card.id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= cards.length) return;
    const other = cards[swapIdx];
    setBusyId(card.id);
    const a = await patchCard(card.id, { sort_order: other.sort_order });
    const b = await patchCard(other.id, { sort_order: card.sort_order });
    setBusyId(null);
    if (a && b) {
      // Re-sort locally so the UI matches the server.
      setCards(cs => [...cs].sort((x, y) => x.sort_order - y.sort_order));
    }
  }

  async function handleFile(card: AudienceCard, file: File) {
    setError(null);
    setBusyId(card.id);
    try {
      const fd = new FormData();
      fd.append("id", card.id);
      fd.append("file", file);
      const res = await fetch("/api/admin/audience-cards/upload", {
        method: "POST",
        headers,
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setCards(cs => cs.map(c => (c.id === card.id ? (json.data as AudienceCard) : c)));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyId(null);
    }
  }

  async function setPastedUrl(card: AudienceCard) {
    const url = (pasteUrls[card.id] ?? "").trim();
    if (!url) return;
    const updated = await patchCard(card.id, { image_url: url });
    if (updated) setPasteUrls(p => ({ ...p, [card.id]: "" }));
  }

  async function clearImage(card: AudienceCard) {
    await patchCard(card.id, { image_url: null });
  }

  const inputClass =
    "w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1";

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#4ea8de]" />
          <h2 className="text-white font-semibold">Audience Cards</h2>
          <span className="text-xs text-blue-500">
            manage the Who We Serve section on /about
          </span>
        </div>
        {open ? (
          <ChevronDown size={18} className="text-blue-400" />
        ) : (
          <ChevronRight size={18} className="text-blue-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>Label and link auto-save on blur. Reorder, toggle, and delete save instantly.</span>
            <button onClick={refresh} className="text-[#4ea8de] hover:underline">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          {loading && cards.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((card, idx) => {
                const Icon = iconFor(card.icon);
                const isBusy = busyId === card.id;
                return (
                  <div
                    key={card.id}
                    className={`bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-3 ${card.is_active ? "" : "opacity-60"}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[56px_1fr_auto] gap-3 items-start">
                      {/* Preview */}
                      <div className="w-14 h-14 rounded-md border border-blue-900/40 bg-[#0d2240] flex items-center justify-center overflow-hidden shrink-0">
                        {card.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.image_url}
                            alt={card.label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon size={22} className="text-[#4ea8de]" />
                        )}
                      </div>

                      {/* Fields */}
                      <div className="space-y-2 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass}>Label</label>
                            <input
                              defaultValue={card.label}
                              onBlur={e => {
                                const v = e.target.value.trim();
                                if (v && v !== card.label) patchCard(card.id, { label: v });
                              }}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Link URL (optional)</label>
                            <input
                              defaultValue={card.link_url ?? ""}
                              placeholder="/events or https://..."
                              onBlur={e => {
                                const v = e.target.value.trim();
                                if ((v || null) !== (card.link_url ?? null)) {
                                  patchCard(card.id, { link_url: v || null });
                                }
                              }}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
                          <div>
                            <label className={labelClass}>Image URL</label>
                            <input
                              type="url"
                              value={pasteUrls[card.id] ?? ""}
                              placeholder={card.image_url ?? "https://… (overrides the icon)"}
                              onChange={e => setPasteUrls(p => ({ ...p, [card.id]: e.target.value }))}
                              className={inputClass}
                            />
                          </div>
                          <button
                            onClick={() => setPastedUrl(card)}
                            disabled={isBusy || !(pasteUrls[card.id] ?? "").trim()}
                            className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white text-xs font-semibold px-3 py-2 rounded inline-flex items-center gap-1.5"
                          >
                            <LinkIcon size={12} /> Set
                          </button>
                          <label className="cursor-pointer bg-[#0d2240] hover:bg-[#0f2a4a] border border-blue-900/40 hover:border-[#4ea8de]/40 text-blue-200 text-xs font-semibold px-3 py-2 rounded inline-flex items-center gap-1.5">
                            <Upload size={12} /> Upload
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleFile(card, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {card.image_url && (
                          <button
                            onClick={() => clearImage(card)}
                            className="text-[11px] text-blue-400 hover:text-blue-200 underline"
                          >
                            Clear image (fall back to {card.icon ?? "Circle"} icon)
                          </button>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex md:flex-col gap-2 md:items-end shrink-0">
                        <div className="flex gap-1">
                          <button
                            onClick={() => move(card, -1)}
                            disabled={idx === 0 || isBusy}
                            title="Move up"
                            className="p-1.5 rounded border border-blue-900/40 hover:border-[#4ea8de]/50 text-blue-300 hover:text-white disabled:opacity-30 disabled:hover:border-blue-900/40"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => move(card, 1)}
                            disabled={idx === cards.length - 1 || isBusy}
                            title="Move down"
                            className="p-1.5 rounded border border-blue-900/40 hover:border-[#4ea8de]/50 text-blue-300 hover:text-white disabled:opacity-30 disabled:hover:border-blue-900/40"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => patchCard(card.id, { is_active: !card.is_active })}
                          disabled={isBusy}
                          className="flex items-center gap-1 text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-2 py-1"
                        >
                          {card.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                          {card.is_active ? "Active" : "Hidden"}
                        </button>
                        <button
                          onClick={() => deleteCard(card)}
                          disabled={isBusy}
                          className="flex items-center gap-1 text-xs text-red-300 hover:text-red-100 border border-red-900/40 hover:border-red-500/50 rounded px-2 py-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={addCard}
              className="inline-flex items-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-sm font-semibold px-3 py-2 rounded-lg"
            >
              <Plus size={14} /> Add card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
