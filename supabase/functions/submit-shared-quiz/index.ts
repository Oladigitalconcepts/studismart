// Score a shared-quiz submission server-side and persist the attempt.
// Requires the user to be signed in (so result is tied to an account).
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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sign-in required to view results." }, 401);

    const body = await req.json().catch(() => ({}));
    const token = body?.token as string | undefined;
    const answers = body?.answers as Array<{ question_id: string; picked_index: number }> | undefined;
    const duration = Number(body?.duration_seconds ?? 0);
    if (!token || !Array.isArray(answers)) return json({ error: "token & answers required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: quiz } = await admin
      .from("shared_quizzes")
      .select("id, question_ids, title, reveal_mode")
      .eq("token", token)
      .maybeSingle();
    if (!quiz) return json({ error: "Quiz not found" }, 404);

    const { data: qs } = await admin
      .from("questions")
      .select("id, question, options, correct_index, explanation, topic")
      .in("id", quiz.question_ids);

    const byId = new Map((qs ?? []).map((q) => [q.id, q]));
    let correct = 0;
    const review = quiz.question_ids.map((id: string) => {
      const q = byId.get(id);
      const a = answers.find((x) => x.question_id === id);
      const picked = a?.picked_index ?? -1;
      const isCorrect = !!q && picked === q.correct_index;
      if (isCorrect) correct++;
      return {
        question_id: id,
        question: q?.question,
        options: q?.options,
        correct_index: q?.correct_index,
        explanation: q?.explanation,
        topic: q?.topic,
        picked_index: picked,
        is_correct: isCorrect,
      };
    });
    const total = quiz.question_ids.length;

    const { data: attempt, error: insErr } = await admin
      .from("shared_quiz_attempts")
      .insert({
        shared_quiz_id: quiz.id,
        taker_id: u.user.id,
        answers,
        correct,
        total,
        duration_seconds: duration,
      })
      .select()
      .single();
    if (insErr) console.error("attempt insert", insErr);

    return json({
      attempt_id: attempt?.id,
      correct,
      total,
      duration_seconds: duration,
      title: quiz.title,
      review,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Failed" }, 500);
  }
});
