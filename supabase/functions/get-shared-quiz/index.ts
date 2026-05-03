// Public fetch of a shared quiz by token. Returns sanitised questions
// (no correct_index / explanation) so anonymous takers cannot cheat.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "token required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: quiz, error } = await admin
      .from("shared_quizzes")
      .select("id, token, title, time_limit_seconds, reveal_mode, question_ids, creator_id, created_at")
      .eq("token", token)
      .maybeSingle();
    if (error || !quiz) return json({ error: "Not found" }, 404);

    const { data: qs } = await admin
      .from("questions")
      .select("id, question, options, topic, difficulty")
      .in("id", quiz.question_ids);

    // Preserve creator's chosen ordering
    const byId = new Map((qs ?? []).map((q) => [q.id, q]));
    const ordered = quiz.question_ids.map((id: string) => byId.get(id)).filter(Boolean);

    return json({
      id: quiz.id,
      token: quiz.token,
      title: quiz.title,
      time_limit_seconds: quiz.time_limit_seconds,
      reveal_mode: quiz.reveal_mode,
      questions: ordered,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Failed" }, 500);
  }
});
