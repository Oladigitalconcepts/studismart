// Generate a notebook-wide study guide: summary, topics, faqs, glossary.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) return json({ error: "AI key not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const notebookId = body?.notebook_id as string | undefined;
    if (!notebookId) return json({ error: "notebook_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: nb } = await admin.from("notebooks").select("id, user_id, title").eq("id", notebookId).maybeSingle();
    if (!nb || nb.user_id !== user.id) return json({ error: "Notebook not found" }, 404);

    const { data: materials } = await admin
      .from("materials")
      .select("title, raw_text, transcript")
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id);

    const sources = (materials ?? []).filter((m: any) => (m.raw_text || m.transcript));
    if (sources.length === 0) return json({ error: "Add sources first" }, 400);

    const perSourceBudget = Math.max(800, Math.floor(20000 / sources.length));
    const context = sources
      .map((s: any, i: number) => `[[S${i + 1}]] ${s.title}\n${(s.transcript || s.raw_text || "").slice(0, perSourceBudget)}`)
      .join("\n\n---\n\n");

    const sys = `You are a study coach. From the provided sources, produce a notebook study guide.
Respond as STRICT JSON ONLY (no markdown fences) matching this schema:
{
  "summary": string (200-400 words),
  "topics": [{ "name": string, "blurb": string (60-120 words) }],  // 4-8 items
  "faqs":   [{ "q": string, "a": string }],                          // 4-8 items
  "glossary":[{ "term": string, "definition": string }]              // 6-12 items
}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Notebook: ${nb.title}\n\nSOURCES:\n${context}` },
        ],
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "Rate limit, please try again." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      console.error("AI error", aiResp.status, t);
      return json({ error: "AI generation failed" }, 500);
    }
    const ai = await aiResp.json();
    let parsed: any = {};
    try { parsed = JSON.parse(ai?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    const guide = {
      summary: String(parsed.summary ?? ""),
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 12) : [],
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 12) : [],
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary.slice(0, 20) : [],
      generated_at: new Date().toISOString(),
    };

    await admin.from("notebook_guides").upsert({
      user_id: user.id,
      notebook_id: notebookId,
      ...guide,
    }, { onConflict: "notebook_id" });

    return json({ guide });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
