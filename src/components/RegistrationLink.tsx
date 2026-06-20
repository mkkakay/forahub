"use client";

// Wraps the "Register Now" anchor on /events/[id]. Click fires the
// registration_click action through the consent-gated tracker, then
// proceeds to the external URL normally. We don't preventDefault: the
// beacon is best-effort and we never want to block the user's
// navigation on it.

import { ExternalLink } from "lucide-react";
import { trackAction } from "@/lib/analytics/track";

export default function RegistrationLink({
  eventId, href, label = "Register Now",
}: { eventId: string; href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackAction({ eventId, action: "registration_click" })}
      className="flex items-center justify-center gap-2 w-full bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-bold px-5 py-3.5 rounded-xl transition-colors text-base shadow-sm hover:shadow-md"
    >
      {label}
      <ExternalLink size={16} />
    </a>
  );
}
