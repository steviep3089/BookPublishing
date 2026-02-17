import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(req: Request) {
  const body = await req.text();
  const headerStore = await headers();
  const sig = headerStore.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown webhook error";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.user_id;
    const chapterId = session.metadata?.chapter_id;
    const purchaseId = session.metadata?.purchase_id;
    const paymentIntent = session.payment_intent?.toString() || null;

    if (!userId || !chapterId) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Mark purchase paid (if we created one)
    if (purchaseId) {
      await supabaseService.from("purchases").update({
        status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntent,
      }).eq("id", purchaseId);
    }

    // Grant permanent entitlement
    await supabaseService.from("entitlements").upsert({
      user_id: userId,
      chapter_id: chapterId,
      expires_at: null,
      source: "purchase",
    });
  }

  return NextResponse.json({ received: true });
}
