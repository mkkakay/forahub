"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import BookmarkButton from "@/components/BookmarkButton";
import CalendarExportMenu from "@/components/CalendarExportMenu";
import ShareMenu from "@/components/ShareMenu";
import type { Database } from "@/lib/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export default function EventDetailActions({ event }: { event: EventRow }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      supabase
        .from("saved_events")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("event_id", event.id)
        .maybeSingle()
        .then(({ data }) => {
          setIsSaved(!!data);
        });
    });
  }, [event.id]);

  return (
    <div className="flex items-center gap-1">
      <BookmarkButton
        eventId={event.id}
        initialSaved={isSaved}
        userId={userId}
        onToggle={setIsSaved}
      />
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
  );
}
