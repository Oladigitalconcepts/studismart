// Notebook chat: answer questions grounded in the user's sources, with citations.
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
    const chatId = body?.chat_id as string | undefined;
    const question = (body?.question as string | undefined)?.trim();
    if (!notebookId || !chatId || !question) return json({ error: "notebook_id, chat_id, question required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify chat ownership
    const { data: chat } = await admin
      .from("notebook_chats")
      .select("id, user_id, notebook_id")
      .eq("id", chatId)
      .maybeSingle();
    if (!chat || chat.user_id !== user.id || chat.notebook_id !== notebookId) {
      return json({ error: "Chat not found" }, 404);
    }

    // Load sources
    const { data: materials } = await admin
      .from("materials")
      .select("id, title, raw_text, transcript, source_type")
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id);

    const sources = (materials ?? []).filter((m: any) => (m.raw_text || m.transcript));
    if (sources.length === 0) {
      return json({ error: "No readable sources in this notebook yet" }, 400);
    }

    // Build context with per-source markers, budget ~20k chars total
    const perSourceBudget = Math.max(800, Math.floor(20000 / sources.length));
    const contextParts: string[] = [];
    sources.forEach((s: any, i: number) => {
      const txt = (s.transcript || s.raw_text || "").slice(0, perSourceBudget);
      contextParts.push(`[[S${i + 1}]] ${s.title}\n${txt}`);
    });
    const context = contextParts.join("\n\n---\n\n");

    // Save user message
    await admin.from("notebook_messages").insert({
      user_id: user.id, chat_id: chatId, role: "user", content: question,
    });

    const sys = `You are a helpful study assistant. Answer the student's question USING ONLY the provided sources.
- Cite the sources you used using their markers like [S1], [S2] inline in your answer.
- If the answer is not in the sources, say "I don't see that in your sources." Do not invent facts.
- Be concise and use markdown (short paragraphs, bullets where helpful).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `SOURCES:\n${context}\n\nQUESTION: ${question}` },
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
    const answer: string = ai?.choices?.[0]?.message?.content ?? "";

    // Parse citations
    const cited = new Set<number>();
    for (const m of answer.matchAll(/\[S(\d+)\]/g)) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= sources.length) cited.add(n);
    }
    const citations = [...cited].sort((a, b) => a - b).map((n) => {
      const s = sources[n - 1] as any;
      return { material_id: s.id, title: s.title };
    });

    // Save assistant message
    await admin.from("notebook_messages").insert({
      user_id: user.id, chat_id: chatId, role: "assistant", content: answer, citations,
    });
    await admin.from("notebook_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);

    return json({ answer, citations });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
