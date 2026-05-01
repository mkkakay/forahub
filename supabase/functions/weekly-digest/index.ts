// Schedule: supabase functions deploy weekly-digest --schedule "0 8 * * 1" (every Monday 8am UTC)
// Requires: RESEND_API_KEY env var in Supabase dashboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  organization: string | null;
  sdg_goals: number[];
  registration_url: string | null;
  registration_deadline: string | null;
}

interface UserPreferencesRow {
  user_id: string;
  sdg_goals: number[];
  email_alerts: boolean;
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ForaHub <digest@forahub.io>",
      to,
      subject,
      text,
    }),
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatEventText(event: EventRow): string {
  const lines: string[] = [
    `• ${event.title}`,
    `  Date: ${formatDate(event.start_date)}${event.end_date ? ` – ${formatDate(event.end_date)}` : ""}`,
  ];
  if (event.location) lines.push(`  Location: ${event.location}`);
  if (event.organization) lines.push(`  Organizer: ${event.organization}`);
  if (event.registration_deadline) lines.push(`  Registration closes: ${formatDate(event.registration_deadline)}`);
  if (event.registration_url) lines.push(`  Register: ${event.registration_url}`);
  return lines.join("\n");
}

Deno.serve(async () => {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get events starting this week (next 7 days)
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, location, organization, sdg_goals, registration_url, registration_deadline")
    .gte("start_date", now.toISOString())
    .lte("start_date", sevenDaysLater.toISOString())
    .order("start_date", { ascending: true });

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
    return new Response("Error fetching events", { status: 500 });
  }

  // Get events with registration deadline within 7 days
  const { data: deadlineEvents } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, location, organization, sdg_goals, registration_url, registration_deadline")
    .gte("registration_deadline", now.toISOString())
    .lte("registration_deadline", sevenDaysLater.toISOString())
    .order("registration_deadline", { ascending: true });

  // Get users with email_alerts enabled
  const { data: preferences, error: prefsError } = await supabase
    .from("user_preferences")
    .select("user_id, sdg_goals, email_alerts")
    .eq("email_alerts", true);

  if (prefsError) {
    console.error("Error fetching preferences:", prefsError);
    return new Response("Error fetching preferences", { status: 500 });
  }

  if (!preferences || preferences.length === 0) {
    return new Response("No users with email alerts", { status: 200 });
  }

  const typedEvents = (events ?? []) as EventRow[];
  const typedDeadlineEvents = (deadlineEvents ?? []) as EventRow[];

  for (const pref of preferences as UserPreferencesRow[]) {
    // Filter events by user's SDG preferences (if they have preferences set)
    const userSdgs = pref.sdg_goals ?? [];
    const filteredEvents =
      userSdgs.length === 0
        ? typedEvents
        : typedEvents.filter(e =>
            e.sdg_goals.some(sdg => userSdgs.includes(sdg))
          );

    const filteredDeadlineEvents =
      userSdgs.length === 0
        ? typedDeadlineEvents
        : typedDeadlineEvents.filter(e =>
            e.sdg_goals.some(sdg => userSdgs.includes(sdg))
          );

    if (filteredEvents.length === 0 && filteredDeadlineEvents.length === 0) continue;

    // Get user email
    const { data: userRecord } = await supabase.auth.admin.getUserById(pref.user_id);
    const email = userRecord?.user?.email;
    if (!email) continue;

    let body = "Hello,\n\nHere is your weekly ForaHub digest:\n\n";

    if (filteredEvents.length > 0) {
      body += `EVENTS THIS WEEK (${filteredEvents.length}):\n\n`;
      body += filteredEvents.map(formatEventText).join("\n\n");
      body += "\n\n";
    }

    if (filteredDeadlineEvents.length > 0) {
      body += `REGISTRATION DEADLINES THIS WEEK:\n\n`;
      body += filteredDeadlineEvents.map(formatEventText).join("\n\n");
      body += "\n\n";
    }

    body += "---\nView all events: https://forahub.io/events\nManage your alerts: https://forahub.io/settings\n\nForaHub";

    await sendEmail(email, "Your Weekly ForaHub Digest", body);
  }

  return new Response("OK", { status: 200 });
});
