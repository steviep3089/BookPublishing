import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

function priceForEpisode(episodeNumber: number) {
  // Simple pricing rule: change however you like
  // e.g. £0.79 each
  return 79; // pence
}

export async function POST(req: Request) {
  const form = await req.formData();
  const chapterId = String(form.get("chapter_id") || "");

  const supa = await supabaseServer();
  const { data: userData } = await supa.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  // Get chapter details using service role (so we can read even if locked)
  const { data: chapter, error } = await supabaseService
    .from("chapters")
    .select("id, episode_number, title, status")
    .eq("id", chapterId)
    .single();

  if (error || !chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  if (chapter.status !== "published") return NextResponse.json({ error: "Not available" }, { status: 400 });

  const amount = priceForEpisode(chapter.episode_number);

  // Create a pending purchase record (optional but helpful)
  const { data: purchase } = await supabaseService.from("purchases").insert({
    user_id: user.id,
    chapter_id: chapter.id,
    amount_pence: amount,
    currency: "gbp",
    status: "pending",
  }).select("id").single();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: amount,
          product_data: {
            name: `Unlock Episode ${chapter.episode_number}`,
            description: chapter.title,
          },
        },
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/episodes`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/episodes`,
    metadata: {
      user_id: user.id,
      chapter_id: chapter.id,
      purchase_id: purchase?.id ?? "",
    },
  });

  return NextResponse.redirect(session.url!, 303);
}
