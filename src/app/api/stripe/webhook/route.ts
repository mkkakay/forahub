import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendPaymentConfirmation(email: string, plan: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const isPro = plan === "pro";
  const subject = isPro ? "Welcome to ForaHub Pro!" : "Welcome, Founding Member!";
  const body = isPro
    ? `<p>Your ForaHub Pro subscription is now active. You have full access to the 24-month event calendar, unlimited saved events, collections, calendar export, and weekly digests.</p>`
    : `<p>Your Founding Member spot is confirmed. You have lifetime Pro access to ForaHub — thank you for being one of our first 100 members.</p>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "ForaHub <hello@forahub.org>",
      to: email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f2a4a;padding:32px;border-radius:12px">
          <h1 style="color:#4ea8de;margin-top:0">Fora<span style="color:#ffffff">Hub</span></h1>
          <h2 style="color:#ffffff">${subject}</h2>
          ${body}
          <p style="color:#93c5fd">The ForaHub team</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://forahub.org"}/events"
            style="display:inline-block;background:#4ea8de;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
            Explore Events →
          </a>
        </div>`,
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook configuration" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const plan = session.metadata?.plan;
      const customerEmail = session.customer_details?.email;

      if (!userId || !plan) {
        console.error("Missing metadata in checkout session");
        return NextResponse.json({ received: true });
      }

      if (plan === "founding") {
        await serviceSupabase
          .from("profiles")
          .update({
            subscription_tier: "founding",
            stripe_customer_id: session.customer as string,
            subscription_end_date: null,
          })
          .eq("id", userId);
      } else if (plan === "pro" && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
        // billing_cycle_anchor + 1 year = end of first annual period
        const endDate = new Date((sub.billing_cycle_anchor + 365 * 24 * 60 * 60) * 1000).toISOString();

        await serviceSupabase
          .from("profiles")
          .update({
            subscription_tier: "pro",
            stripe_customer_id: session.customer as string,
            subscription_end_date: endDate,
          })
          .eq("id", userId);
      }

      if (customerEmail && plan) {
        await sendPaymentConfirmation(customerEmail, plan);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      await serviceSupabase
        .from("profiles")
        .update({ subscription_tier: "free", subscription_end_date: null })
        .eq("stripe_customer_id", customerId);
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const endDate = new Date((sub.billing_cycle_anchor + 365 * 24 * 60 * 60) * 1000).toISOString();

      await serviceSupabase
        .from("profiles")
        .update({ subscription_end_date: endDate })
        .eq("stripe_customer_id", customerId);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
