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

    const reference = `cp_${user.id.slice(0, 8)}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const secretKey = Deno.env.get("Paystack_Secret_Key");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "payments are not configured yet" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try the requested currency; if the Paystack account doesn't support it
    // (common for USD on NGN-only accounts), fall back to NGN so the user can
    // still pay instead of seeing a dead checkout.
    const tryInit = async (ccy: "NGN" | "USD") => {
      const price = pack.prices[ccy];
      const amountMinor = Math.round(price * 100); // kobo / cents
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount: amountMinor,
          currency: ccy,
          reference,
          callback_url: callbackUrl,
          metadata: { user_id: user.id, pack_id: packId, coins: pack.coins },
        }),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json?.status === true, json, amountMinor, ccy };
    };

    let attempt = await tryInit(currency);
    if (!attempt.ok && currency !== "NGN") {
      attempt = await tryInit("NGN");
    }
    if (!attempt.ok) {
      return new Response(JSON.stringify({ error: attempt.json?.message ?? "paystack init failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only record the pending purchase once Paystack accepted the transaction —
    // otherwise failed inits leave orphan "pending" rows forever.
    const { error: insErr } = await supabase.from("coin_purchases").insert({
      user_id: user.id,
      reference,
      pack_id: packId,
      coins: pack.coins,
      amount_minor: attempt.amountMinor,
      currency: attempt.ccy,
      status: "pending",
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({
      authorization_url: attempt.json.data.authorization_url,
      access_code: attempt.json.data.access_code,
      reference,
      currency: attempt.ccy,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
