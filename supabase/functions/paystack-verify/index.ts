// Verifies a Paystack transaction directly with their API and credits the
// purchase via the secure `credit_purchase` RPC. This is a safety net so a
// user is always credited even if the webhook is delayed/missed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = userRes.user.id;

    const { reference } = await req.json().catch(() => ({}));
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "missing reference" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: pending } = await admin
      .from("coin_purchases").select("*").eq("reference", reference).maybeSingle();
    if (!pending || pending.user_id !== uid) {
      return new Response(JSON.stringify({ error: "purchase not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (pending.status === "credited") {
      return new Response(JSON.stringify({ status: "credited", coins: pending.coins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const secret = Deno.env.get("Paystack_Secret_Key") ?? "";
    const ps = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const verify = await ps.json();
    const psStatus: string | null = verify?.data?.status ?? null;

    if (!ps.ok || psStatus !== "success") {
      // Terminal Paystack states, or a transaction that has been hanging for
      // over an hour, get marked failed so the app stops polling forever.
      const terminal = psStatus === "failed" || psStatus === "abandoned" || psStatus === "reversed";
      const stale = Date.now() - new Date(pending.created_at).getTime() > 60 * 60 * 1000;
      if (terminal || stale) {
        await admin.from("coin_purchases")
          .update({ status: "failed", raw: verify?.data ?? {} })
          .eq("id", pending.id);
        return new Response(JSON.stringify({ status: "failed", paystack: psStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ status: "pending", paystack: psStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (pending.amount_minor !== verify.data.amount || pending.currency !== verify.data.currency) {
      return new Response(JSON.stringify({ error: "amount mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("coin_purchases").update({ raw: verify.data }).eq("id", pending.id);
    const { error: rpcErr } = await admin.rpc("credit_purchase", { _reference: reference });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ status: "credited", coins: pending.coins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
