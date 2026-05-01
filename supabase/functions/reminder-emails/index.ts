// Schedule: supabase functions deploy reminder-emails --schedule "0 7 * * *" (daily 7am UTC)
// Requires: RESEND_API_KEY env var in Supabase dashboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface SavedEventWithDetails {
  id: string;
  user_id: string;
  event_id: string;
  reminder_date: string;
  notes: string | null;
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    organization: string | null;
    registration_url: string | null;
  };
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
      from: "ForaHub <reminders@forahub.io>",
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

Deno.serve(async () => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Find saved_events where reminder_date::date = today
  const { data: reminders, error } = await supabase
    .from("saved_events")
    .select("id, user_id, event_id, reminder_date, notes, event:events(id, title, start_date, end_date, location, organization, registration_url)")
    .gte("reminder_date", `${today}T00:00:00.000Z`)
    .lt("reminder_date", `${today}T23:59:59.999Z`);

  if (error) {
    console.error("Error fetching reminders:", error);
    return new Response("Error fetching reminders", { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return new Response("No reminders for today", { status: 200 });
  }

  for (const reminder of reminders as SavedEventWithDetails[]) {
    const event = reminder.event;
    if (!event) continue;

    // Get user email
    const { data: userRecord } = await supabase.auth.admin.getUserById(reminder.user_id);
    const email = userRecord?.user?.email;
    if (!email) continue;

    const lines = [
      `Hello,`,
      ``,
      `This is your reminder for an event you saved on ForaHub:`,
      ``,
      `${event.title}`,
      `Date: ${formatDate(event.start_date)}${event.end_date ? ` – ${formatDate(event.end_date)}` : ""}`,
    ];

    if (event.location) lines.push(`Location: ${event.location}`);
    if (event.organization) lines.push(`Organizer: ${event.organization}`);
    if (reminder.notes) lines.push(``, `Your notes: ${reminder.notes}`);
    if (event.registration_url) lines.push(``, `Register here: ${event.registration_url}`);

    lines.push(
      ``,
      `---`,
      `View this event: https://forahub.io/events/${event.id}`,
      `Manage your saved events: https://forahub.io/saved`,
      ``,
      `ForaHub`
    );

    await sendEmail(
      email,
      `Reminder: ${event.title}`,
      lines.join("\n")
    );
  }

  return new Response("OK", { status: 200 });
});
