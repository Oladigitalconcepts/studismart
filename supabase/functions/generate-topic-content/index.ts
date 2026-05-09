// Generate AI-written explanation for a single topic from a study pack.
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
    const studyPackId = body?.study_pack_id as string | undefined;
    const topic = (body?.topic as string | undefined)?.trim();
    if (!studyPackId || !topic) return json({ error: "study_pack_id and topic required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: pack } = await admin
      .from("study_packs")
      .select("id, user_id, summary, material_id")
      .eq("id", studyPackId)
      .maybeSingle();
    if (!pack || pack.user_id !== user.id) return json({ error: "Study pack not found" }, 404);

    const { data: material } = await admin
      .from("materials")
      .select("title, raw_text")
      .eq("id", pack.material_id)
      .maybeSingle();

    const sourceText = (material?.raw_text ?? "").slice(0, 16000);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly study tutor. Given study material and a specific topic, write a clear, focused explanation of THAT topic only. Use markdown: a short intro paragraph, then key points as bullets, then a 1-line takeaway. Keep it concise (200-350 words). Do not add a heading — start with the intro paragraph.",
          },
          {
            role: "user",
            content: `Material: ${material?.title ?? "Untitled"}\n\nTopic to explain: "${topic}"\n\nOverall summary:\n${pack.summary ?? ""}\n\nSource notes (truncated):\n${sourceText}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "Rate limit, please try again." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      console.error("AI error", aiResp.status, errText);
      return json({ error: "AI generation failed" }, 500);
    }

    const ai = await aiResp.json();
    const content = ai?.choices?.[0]?.message?.content ?? "";
    return json({ topic, content });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
