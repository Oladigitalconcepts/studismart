// Generate a clean, professional slide deck from a study pack's material.
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

const SLIDE_TOOL = {
  type: "function",
  function: {
    name: "build_slide_deck",
    description: "Produce a professional slide deck from study material.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Deck title (3-7 words)." },
        slides: {
          type: "array",
          minItems: 6,
          maxItems: 14,
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["title", "content", "summary"],
              },
              title: { type: "string", description: "Slide headline (max 8 words)." },
              subtitle: { type: "string", description: "Optional one-line subtitle." },
              bullets: {
                type: "array",
                items: { type: "string" },
                description: "3-5 short bullet points (max ~14 words each).",
              },
              note: { type: "string", description: "Optional speaker note (one sentence)." },
            },
            required: ["type", "title"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "slides"],
      additionalProperties: false,
    },
  },
} as const;

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
    if (!studyPackId) return json({ error: "study_pack_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: pack } = await admin
      .from("study_packs")
      .select("id, user_id, summary, topics, material_id")
      .eq("id", studyPackId)
      .maybeSingle();
    if (!pack || pack.user_id !== user.id) return json({ error: "Study pack not found" }, 404);

    // Reuse existing deck if present
    const { data: existing } = await admin
      .from("slide_decks")
      .select("*")
      .eq("study_pack_id", studyPackId)
      .maybeSingle();
    if (existing && body?.force !== true) {
      return json({ deck: existing });
    }

    const { data: material } = await admin
      .from("materials")
      .select("title, raw_text")
      .eq("id", pack.material_id)
      .maybeSingle();

    const topics = Array.isArray(pack.topics) ? pack.topics.map((t: any) => t.name).filter(Boolean) : [];
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
              "You design clean, professional study slide decks. Use crisp headlines, short bullet points (no full sentences), no fluff. Cover each topic with at least one slide. Start with a title slide and end with a summary slide.",
          },
          {
            role: "user",
            content: `Material title: ${material?.title ?? "Untitled"}\n\nTopics to cover: ${topics.join(", ")}\n\nSummary so far:\n${pack.summary ?? ""}\n\nRaw notes (truncated):\n${sourceText}`,
          },
        ],
        tools: [SLIDE_TOOL],
        tool_choice: { type: "function", function: { name: "build_slide_deck" } },
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
    const toolCall = ai?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return json({ error: "AI returned no slides" }, 500);

    const parsed = JSON.parse(toolCall.function.arguments);
    const title: string = parsed.title ?? material?.title ?? "Slides";
    const slides = Array.isArray(parsed.slides) ? parsed.slides : [];

    const upsertPayload = {
      study_pack_id: studyPackId,
      user_id: user.id,
      title,
      slides,
    };

    let deck;
    if (existing) {
      const { data, error } = await admin
        .from("slide_decks")
        .update(upsertPayload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      deck = data;
    } else {
      const { data, error } = await admin
        .from("slide_decks")
        .insert(upsertPayload)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      deck = data;
    }

    return json({ deck });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
