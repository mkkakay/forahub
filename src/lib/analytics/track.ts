// Single client-side tracking helper. Every analytics-emitting component
// imports trackAction from here so:
//   - the consent gate cannot be bypassed
//   - the anonymous-id rotation lives in one place
//   - the network call shape is consistent and fire-and-forget

import {
  getOrCreateAnonymousId,
  isAnalyticsAllowed,
} from "./consent";
import { VIEW_DEDUPE_PREFIX } from "./constants";

type Action = "view" | "save" | "unsave" | "registration_click";

interface TrackOpts {
  eventId: string;
  action: Action;
  /** Optional referrer host — caller can pass document.referrer; the
   *  server normalizes/whitelists to host-only. Most callers leave this
   *  unset. */
  referrer?: string;
}

export function trackAction(opts: TrackOpts): void {
  if (typeof window === "undefined") return;

  // The gate. If the user hasn't consented (or has DNT/GPC), we never
  // touch the network. Defence-in-depth: the server route also checks.
  if (!isAnalyticsAllowed()) return;

  // For VIEW actions only: dedupe within a session so refresh ≠ 5 views.
  if (opts.action === "view") {
    const key = VIEW_DEDUPE_PREFIX + opts.eventId;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch { /* private mode */ }
  }

  const anonymousId = getOrCreateAnonymousId() ?? undefined;
  const payload = {
    event_id: opts.eventId,
    action: opts.action,
    anonymous_id: anonymousId,
    referrer: opts.referrer ?? (document.referrer || undefined),
  };

  try {
    // sendBeacon survives page unload (esp. for view-on-detail). Falls
    // back to fetch keepalive on browsers without beacon.
    const data = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/analytics/event", data);
      return;
    }
  } catch { /* fall through to fetch */ }

  try {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch { /* ignore — analytics is best-effort */ }
}
