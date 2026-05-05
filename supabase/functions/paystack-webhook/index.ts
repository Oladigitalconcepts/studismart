// Paystack webhook — verifies HMAC SHA-512 signature against secret key,
// then credits the coin purchase via the secure `credit_purchase` RPC.
// Idempotent: duplicate deliveries are safely ignored.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-paystack-signature",
};

async function hmacSha512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const secret = Deno.env.get("Paystack_Secret_Key") ?? "";
  const expected = await hmacSha512Hex(secret, raw);
  if (signature !== expected) {
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch {
    return new Response("bad json", { status: 400 });
  }

  // Always ack 200 quickly; only act on charge.success.
  if (event?.event !== "charge.success") {
    return new Response(JSON.stringify({ ok: true, ignored: event?.event }), { headers: { "Content-Type": "application/json" } });
  }

  const reference = event?.data?.reference;
  if (!reference) return new Response(JSON.stringify({ ok: true, ignored: "no_ref" }), { headers: { "Content-Type": "application/json" } });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify with Paystack (defense in depth) and check amount/currency match the stored pending row.
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const verify = await verifyRes.json();
  if (!verifyRes.ok || verify?.data?.status !== "success") {
    return new Response(JSON.stringify({ error: "verify failed" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { data: pending, error: selErr } = await admin
    .from("coin_purchases").select("*").eq("reference", reference).maybeSingle();
  if (selErr || !pending) {
    return new Response(JSON.stringify({ error: "purchase not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  if (pending.amount_minor !== verify.data.amount || pending.currency !== verify.data.currency) {
    return new Response(JSON.stringify({ error: "amount mismatch" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Persist raw payload for audit, then credit (idempotent).
  await admin.from("coin_purchases").update({ raw: verify.data }).eq("id", pending.id);
  const { error: rpcErr } = await admin.rpc("credit_purchase", { _reference: reference });
  if (rpcErr) {
    return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
