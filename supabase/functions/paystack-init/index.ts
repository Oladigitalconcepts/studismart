// Initializes a Paystack transaction for a coin pack purchase.
// Returns an authorization_url the client redirects to. Coins are NOT credited
// here — only after the webhook confirms `charge.success`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PACKS: Record<string, { coins: number; prices: { NGN: number; USD: number } }> = {
  pack_100:  { coins: 100,  prices: { NGN: 100,  USD: 0.99 } },
  pack_500:  { coins: 500,  prices: { NGN: 200,  USD: 3.99 } },
  pack_1000: { coins: 1000, prices: { NGN: 500,  USD: 6.99 } },
  pack_2500: { coins: 2500, prices: { NGN: 1000, USD: 13.99 } },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user = userRes.user;

    const body = await req.json().catch(() => ({}));
    const packId = String(body.pack_id ?? "");
    const currency = (body.currency === "USD" ? "USD" : "NGN") as "NGN" | "USD";
    const callbackUrl = typeof body.callback_url === "string" ? body.callback_url : undefined;
    const pack = PACKS[packId];
    if (!pack) {
      return new Response(JSON.stringify({ error: "invalid pack" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const price = pack.prices[currency];
    // Paystack minor units: NGN kobo = *100, USD cents = *100.
    const amountMinor = Math.round(price * 100);
    const reference = `cp_${user.id.slice(0, 8)}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Insert pending purchase (RLS: user inserting own row).
    const { error: insErr } = await supabase.from("coin_purchases").insert({
      user_id: user.id,
      reference,
      pack_id: packId,
      coins: pack.coins,
      amount_minor: amountMinor,
      currency,
      status: "pending",
    });
    if (insErr) throw insErr;

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("Paystack_Secret_Key")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountMinor,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: { user_id: user.id, pack_id: packId, coins: pack.coins },
      }),
    });
    const ps = await psRes.json();
    if (!psRes.ok || !ps.status) {
      return new Response(JSON.stringify({ error: ps.message ?? "paystack init failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      authorization_url: ps.data.authorization_url,
      access_code: ps.data.access_code,
      reference,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
