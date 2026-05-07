// Tutor chat edge function: handles personality, model routing, caching,
// coin charging, and persistence. Non-streaming for simplicity + caching.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TutorId = "computing" | "engineering" | "science" | "business" | "language" | "agriculture" | "earth";
type Action = "ask" | "explain_more" | "give_example" | "generate_quiz" | "deep" | "simplify" | "visualize" | "show_code" | "show_formula" | "step_by_step" | "case_study" | "real_example" | "strategy" | "correct" | "improve_sentence" | "practice" | "tips" | "best_practice" | "common_mistakes" | "concept" | "why_matters" | "debug";

const TUTORS: Record<TutorId, { name: string; domain: string; persona: string }> = {
  computing: {
    name: "Computing Tutor",
    domain: "computing, programming, software, algorithms, data structures, web/mobile dev",
    persona:
      "You are a friendly programming tutor. Always include short, runnable code examples in fenced code blocks when relevant. Use simple words. You can debug code and explain it line by line.",
  },
  engineering: {
    name: "Engineering Tutor",
    domain: "engineering principles, mechanics, electronics, problem solving, formulas",
    persona:
      "You are a structured engineering tutor. Explain step-by-step using numbered steps. Include formulas in inline math notation when needed. Focus on practical problem solving.",
  },
  science: {
    name: "Science Tutor",
    domain: "physics, chemistry, biology and general science",
    persona:
      "You are a friendly science tutor. Use simple real-life analogies and avoid jargon. Keep it short and vivid.",
  },
  business: {
    name: "Business Tutor",
    domain: "business, finance, marketing, strategy, entrepreneurship",
    persona:
      "You are a sharp business mentor. Use real-world case-study style examples and a strategic, decisive tone.",
  },
  language: {
    name: "Language Tutor",
    domain: "language learning, grammar, vocabulary, writing, conversation",
    persona:
      "You are a warm language tutor. Correct grammar gently, suggest better sentences, and encourage practice and conversation.",
  },
  agriculture: {
    name: "Agriculture Tutor",
    domain: "farming, crops, livestock, soil, agribusiness",
    persona:
      "You are a practical agriculture tutor. Give real-world, step-by-step farming methods that suit small and medium farmers.",
  },
  earth: {
    name: "Earth Sciences Tutor",
    domain: "earth science, geology, weather, climate, environment",
    persona:
      "You are an Earth sciences tutor. Explain natural processes simply and connect each concept to real-world impact.",
  },
};

// Every AI request now costs at least 1 coin. Heavier actions cost more.
const ACTION_COSTS: Record<Action, number> = {
  ask: 1,
  give_example: 1,
  simplify: 1,
  visualize: 1,
  correct: 1,
  practice: 1,
  concept: 1,
  why_matters: 1,
  show_code: 1,
  show_formula: 1,
  tips: 1,
  best_practice: 1,
  common_mistakes: 1,
  real_example: 1,
  case_study: 1,
  strategy: 1,
  improve_sentence: 1,
  step_by_step: 1,
  explain_more: 2,
  debug: 2,
  generate_quiz: 3,
  deep: 3,
};

const FREE_DAILY_LIMIT = 0;

// Every tutor uses a top-tier model so answers are as strong as ChatGPT,
// just locked to their specialization via the system prompt.
const ROUTE_MODEL = (_action: Action, _len: number) => "google/gemini-2.5-pro";

const ACTION_INSTRUCTION: Partial<Record<Action, string>> = {
  ask: "Answer concisely.",
  explain_more: "Expand the previous answer with more depth and one extra example.",
  give_example: "Give one short, vivid example.",
  generate_quiz: "Create 3 short multiple-choice questions (with answers at the end) about the topic.",
  deep: "Give a deep but well-organized explanation, with sub-headings and key takeaways.",
  simplify: "Simplify the previous answer for a beginner in 4 short sentences.",
  visualize: "Describe a clear mental picture or analogy in under 80 words.",
  show_code: "Provide a minimal, runnable code example with a 1–2 line explanation.",
  show_formula: "Show the relevant formula(s) and define each variable briefly.",
  step_by_step: "Solve or explain step by step using numbered steps.",
  case_study: "Use a brief real-world case study to illustrate.",
  real_example: "Give one realistic real-world example.",
  strategy: "Frame as a practical strategy with 3 bullet actions.",
  correct: "Correct any grammar mistakes in the user's last message and explain briefly.",
  improve_sentence: "Suggest 2 better versions of the user's sentence with reasons.",
  practice: "Suggest a short practice exercise the user can do now.",
  tips: "Share 3 actionable tips.",
  best_practice: "Share the single best practice and why.",
  common_mistakes: "List the 3 most common mistakes and how to avoid them.",
  concept: "Explain the underlying concept in plain language.",
  why_matters: "Explain why this matters in the real world in under 80 words.",
  debug: "Find the bug, explain the fix, and show corrected code.",
};

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const tutorId = body.tutorId as TutorId;
    const action = (body.action ?? "ask") as Action;
    const message = String(body.message ?? "").slice(0, 2000);
    const chatId = body.chatId as string | undefined;
    const idemKey = String(body.idempotencyKey ?? `${user.id}_${Date.now()}_${Math.random()}`);

    const tutor = TUTORS[tutorId];
    if (!tutor) return new Response(JSON.stringify({ error: "invalid tutor" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!message.trim()) return new Response(JSON.stringify({ error: "empty message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const cost = ACTION_COSTS[action] ?? 0;

    // Free-daily quota for ask
    if (cost === 0 && action === "ask") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await admin.from("tutor_daily_usage").select("free_count").eq("user_id", user.id).eq("day", today).maybeSingle();
      const used = usage?.free_count ?? 0;
      if (used >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: "daily_limit", message: "Daily free questions used. Try a paid action or come back tomorrow." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Ensure chat
    let activeChatId = chatId;
    if (!activeChatId) {
      const { data: c, error: cErr } = await admin.from("tutor_chats").insert({ user_id: user.id, tutor_id: tutorId, title: message.slice(0, 60) }).select().single();
      if (cErr) throw cErr;
      activeChatId = c.id;
    }

    // Persist user message
    await admin.from("tutor_messages").insert({ chat_id: activeChatId, user_id: user.id, role: "user", content: message, action });

    // Cache lookup
    const cacheKey = await sha256(`${tutorId}|${action}|${message.toLowerCase().trim()}`);
    const { data: cached } = await admin.from("tutor_cache").select("response, model").eq("hash", cacheKey).maybeSingle();

    let answer: string;
    let model: string;
    let wasCached = false;

    if (cached) {
      answer = cached.response;
      model = cached.model ?? "cache";
      wasCached = true;
      await admin.from("tutor_cache").update({ hits: (await admin.from("tutor_cache").select("hits").eq("hash", cacheKey).single()).data!.hits + 1 }).eq("hash", cacheKey);
    } else {
      // Charge coins BEFORE expensive call (idempotent)
      if (cost > 0) {
        const { error: spendErr } = await admin.rpc("spend_coins_for_tutor", {
          _user_id: user.id, _amount: cost, _reason: `tutor_${tutorId}_${action}`, _idempotency_key: idemKey,
        });
        if (spendErr) {
          const msg = spendErr.message?.includes("insufficient") ? "insufficient_coins" : spendErr.message;
          return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      model = ROUTE_MODEL(action, message.length);
      const system = `${tutor.persona}\n\nYour ONLY domain is: ${tutor.domain}.\nIf the user asks something clearly outside that domain, reply: "This is outside my specialization, but I can guide you briefly…" then give 2-3 short sentences and suggest the right tutor.\nKeep replies between 80 and 300 words. Use bullet points or numbered steps when helpful. Do not be verbose.`;
      const userPrompt = ACTION_INSTRUCTION[action] ? `${ACTION_INSTRUCTION[action]}\n\nUser: ${message}` : message;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("AI error", aiResp.status, t);
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit, please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await aiResp.json();
      answer = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

      // Cache it
      await admin.from("tutor_cache").insert({ hash: cacheKey, tutor_id: tutorId, action, response: answer, model }).then(() => {}, () => {});

      // Track free quota usage
      if (cost === 0 && action === "ask") {
        const today = new Date().toISOString().slice(0, 10);
        const { data: u } = await admin.from("tutor_daily_usage").select("free_count").eq("user_id", user.id).eq("day", today).maybeSingle();
        if (u) await admin.from("tutor_daily_usage").update({ free_count: u.free_count + 1 }).eq("user_id", user.id).eq("day", today);
        else await admin.from("tutor_daily_usage").insert({ user_id: user.id, day: today, free_count: 1 });
      }
    }

    // Persist assistant message
    await admin.from("tutor_messages").insert({
      chat_id: activeChatId, user_id: user.id, role: "assistant",
      content: answer, action, coins_spent: wasCached ? 0 : cost, cached: wasCached, model,
    });
    await admin.from("tutor_chats").update({ updated_at: new Date().toISOString() }).eq("id", activeChatId);

    return new Response(JSON.stringify({ chatId: activeChatId, answer, cached: wasCached, model, coinsSpent: wasCached ? 0 : cost }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tutor-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
