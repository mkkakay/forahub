import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FOUNDING_MEMBER_LIMIT = 100;

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, userEmail } = await req.json();

    if (!plan || !userId || !userEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (plan !== "pro" && plan !== "founding") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Founding member cap check
    if (plan === "founding") {
      const { data: count } = await serviceSupabase.rpc("get_founding_member_count");
      if ((count ?? 0) >= FOUNDING_MEMBER_LIMIT) {
        return NextResponse.json({ error: "All founding spots are taken" }, { status: 409 });
      }
    }

    // Find or create Stripe customer
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await serviceSupabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin") ?? "http://localhost:3000";

    if (plan === "pro") {
      const priceId = process.env.STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        return NextResponse.json({ error: "Pro price not configured" }, { status: 500 });
      }

      const session = await getStripe().checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        // Omitting payment_method_types lets Stripe dynamically show all enabled
        // methods from the dashboard, including Apple Pay, Google Pay, and Link.
        success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/cancel`,
        metadata: { supabase_user_id: userId, plan: "pro" },
        subscription_data: { metadata: { supabase_user_id: userId } },
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: session.url });
    }

    // Founding member — one-time payment
    const foundingPriceId = process.env.STRIPE_FOUNDING_PRICE_ID;
    if (!foundingPriceId) {
      return NextResponse.json({ error: "Founding price not configured" }, { status: 500 });
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: foundingPriceId, quantity: 1 }],
      // Omitting payment_method_types lets Stripe dynamically show all enabled
      // methods from the dashboard, including Apple Pay, Google Pay, and Link.
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      metadata: { supabase_user_id: userId, plan: "founding" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
