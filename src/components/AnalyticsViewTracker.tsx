"use client";

// Mounted on /events/[id] to fire ONE view event per (session, event-id).
// The gate (consent + DNT/GPC + session-dedupe) lives in trackAction; this
// component is just the mount point.

import { useEffect } from "react";
import { trackAction } from "@/lib/analytics/track";

export default function AnalyticsViewTracker({ eventId }: { eventId: string }) {
  useEffect(() => {
    trackAction({ eventId, action: "view" });
  }, [eventId]);
  return null;
}
